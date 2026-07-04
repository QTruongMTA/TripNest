module Api
  module V1
    class PropertiesController < ApplicationController
      include FallbackDatabase

      def index
        page = integer_param(:page, 1)
        limit = integer_param(:limit, 12, max: 50)
        offset = (page - 1) * limit

        filters = ['p.status = $1']
        values = ["ACTIVE"]

        if params[:city].present?
          values << "%#{params[:city]}%"
          filters << "p.city ILIKE $#{values.length}"
        end

        if params[:type].present?
          values << params[:type]
          filters << "p.type = $#{values.length}"
        end

        if params[:guests].present?
          values << params[:guests].to_i
          filters << 'p."maxGuests" >= $' + values.length.to_s
        end

        where_clause = filters.join(" AND ")
        total = db.exec_params(
          %(SELECT COUNT(*) AS total FROM "Property" p WHERE #{where_clause}),
          values
        ).first["total"].to_i

        rows = db.exec_params(
          <<~SQL,
            SELECT p.id, p.title, p.city, p.country, p.type, p."pricePerNight",
                   p."cleaningFee", p."maxGuests", p."bedroomCount", p.bathrooms
            FROM "Property" p
            WHERE #{where_clause}
            ORDER BY p."createdAt" DESC
            LIMIT $#{values.length + 1}
            OFFSET $#{values.length + 2}
          SQL
          values + [limit, offset]
        ).to_a

        ids = rows.map { |row| row["id"] }
        images = image_map("PropertyImage", "propertyId", ids)
        ratings = rating_for(:property, ids)
        amenities = amenities_for(ids)

        render json: {
          data: rows.map do |row|
            image = images[row["id"]]
            {
              id: row["id"],
              title: row["title"],
              city: row["city"],
              country: row["country"],
              type: row["type"],
              pricePerNight: numeric(row["pricePerNight"]),
              cleaningFee: numeric(row["cleaningFee"]),
              maxGuests: row["maxGuests"].to_i,
              bedroomCount: row["bedroomCount"].to_i,
              bathrooms: row["bathrooms"].to_i,
              amenityNames: amenities[row["id"]] || [],
              thumbnailUrl: image&.fetch(:url, nil),
              rating: ratings[row["id"]] || { average: nil, count: 0 },
              fallbackSource: "ruby-api"
            }
          end,
          meta: {
            page: page,
            limit: limit,
            total: total,
            totalPages: (total.to_f / limit).ceil
          }
        }
      end

      def show
        row = db.exec_params(
          <<~SQL,
            SELECT p.*, u.name AS host_name, u.avatar AS host_avatar
            FROM "Property" p
            LEFT JOIN "User" u ON u.id = p."hostId"
            WHERE p.id = $1 AND p.status = 'ACTIVE'
            LIMIT 1
          SQL
          [params[:id]]
        ).first

        return render json: { error: { code: "NOT_FOUND", message: "Property not found" } }, status: :not_found unless row

        images = property_images(row["id"])
        amenities = amenities_for([row["id"]])[row["id"]] || []
        rating = rating_for(:property, [row["id"]])[row["id"]] || { average: nil, count: 0 }

        render json: {
          id: row["id"],
          title: row["title"],
          city: row["city"],
          country: row["country"],
          type: row["type"],
          pricePerNight: numeric(row["pricePerNight"]),
          cleaningFee: numeric(row["cleaningFee"]),
          maxGuests: row["maxGuests"].to_i,
          bedroomCount: row["bedroomCount"].to_i,
          bathrooms: row["bathrooms"].to_i,
          livingRoomSofaBeds: row["livingRoomSofaBeds"].to_i,
          childrenAllowed: row["childrenAllowed"] == "t",
          cribsAvailable: row["cribsAvailable"] == "t",
          sizeM2: numeric(row["sizeM2"]),
          thumbnailUrl: images.find { |image| image[:isPrimary] }&.fetch(:url, nil) || images.first&.fetch(:url, nil),
          rating: rating,
          reviews: [],
          description: row["description"],
          address: {
            line1: row["addressLine1"],
            line2: row["addressLine2"],
            city: row["city"],
            postalCode: row["postalCode"],
            country: row["country"]
          },
          location: {
            latitude: numeric(row["latitude"]),
            longitude: numeric(row["longitude"])
          },
          capacity: {
            maxGuests: row["maxGuests"].to_i,
            bedroomCount: row["bedroomCount"].to_i,
            bathrooms: row["bathrooms"].to_i
          },
          bedrooms: [],
          policies: {
            cancellationPolicy: row["cancellationPolicy"],
            cancellationFreeDays: row["cancellationFreeDays"].to_i,
            mistakeProtection: row["mistakeProtection"] == "t",
            bookingMethod: row["bookingMethod"],
            checkIn: { from: row["checkInFrom"], to: row["checkInTo"] },
            checkOut: { from: row["checkOutFrom"], to: row["checkOutTo"] },
            smokingAllowed: row["smokingAllowed"] == "t",
            partiesAllowed: row["partiesAllowed"] == "t",
            petsPolicy: row["petsPolicy"]
          },
          services: {
            breakfastIncluded: row["breakfastIncluded"] == "t",
            parkingType: row["parkingType"]
          },
          languages: [],
          ratePlans: [],
          childPricing: nil,
          images: images,
          amenities: amenities.map { |name| { id: name, name: name, icon: nil } },
          host: {
            id: row["hostId"],
            name: row["host_name"],
            avatar: row["host_avatar"]
          },
          availability: {
            blockedDates: [],
            dailyRates: [],
            window: row["availabilityWindow"].to_i,
            longStayAllowed: row["longStayAllowed"] == "t",
            maxStayNights: row["maxStayNights"]&.to_i
          },
          createdAt: row["createdAt"],
          updatedAt: row["updatedAt"],
          fallbackSource: "ruby-api"
        }
      end

      private

      def amenities_for(ids)
        return {} if ids.empty?

        rows = db.exec_params(
          <<~SQL,
            SELECT join_table."B" AS property_id, a.name
            FROM "_AmenityToProperty" join_table
            JOIN "Amenity" a ON a.id = join_table."A"
            WHERE join_table."B" = ANY($1)
            ORDER BY a.name ASC
          SQL
          [PG::TextEncoder::Array.new.encode(ids)]
        )

        rows.each_with_object(Hash.new { |hash, key| hash[key] = [] }) do |row, memo|
          memo[row["property_id"]] << row["name"]
        end
      end

      def property_images(property_id)
        db.exec_params(
          <<~SQL,
            SELECT id, url, "isPrimary"
            FROM "PropertyImage"
            WHERE "propertyId" = $1
            ORDER BY "isPrimary" DESC, id ASC
          SQL
          [property_id]
        ).map do |row|
          {
            id: row["id"],
            url: normalize_upload_url(row["url"]),
            isPrimary: row["isPrimary"] == "t"
          }
        end
      end
    end
  end
end

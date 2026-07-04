module Api
  module V1
    class ToursController < ApplicationController
      include FallbackDatabase

      def index
        page = integer_param(:page, 1)
        limit = integer_param(:limit, 12, max: 50)
        offset = (page - 1) * limit

        filters = ['t.status = $1']
        values = ["ACTIVE"]

        if params[:city].present?
          values << "%#{params[:city]}%"
          filters << "t.city ILIKE $#{values.length}"
        end

        if params[:category].present?
          values << params[:category]
          filters << "t.category = $#{values.length}"
        end

        where_clause = filters.join(" AND ")
        total = db.exec_params(
          %(SELECT COUNT(*) AS total FROM "Tour" t WHERE #{where_clause}),
          values
        ).first["total"].to_i

        rows = db.exec_params(
          <<~SQL,
            SELECT t.id, t.title, t.city, t.country, t.category, t."pricePerPerson",
                   t."durationDays", t."minGroupSize", t."maxGroupSize"
            FROM "Tour" t
            WHERE #{where_clause}
            ORDER BY t."createdAt" DESC
            LIMIT $#{values.length + 1}
            OFFSET $#{values.length + 2}
          SQL
          values + [limit, offset]
        ).to_a

        ids = rows.map { |row| row["id"] }
        images = image_map("TourImage", "tourId", ids)
        ratings = rating_for(:tour, ids)

        render json: {
          data: rows.map do |row|
            image = images[row["id"]]
            {
              id: row["id"],
              title: row["title"],
              city: row["city"],
              country: row["country"],
              category: row["category"],
              pricePerPerson: numeric(row["pricePerPerson"]),
              durationDays: row["durationDays"].to_i,
              minGroupSize: row["minGroupSize"].to_i,
              maxGroupSize: row["maxGroupSize"].to_i,
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
            SELECT t.*, u.name AS host_name, u.avatar AS host_avatar
            FROM "Tour" t
            LEFT JOIN "User" u ON u.id = t."hostId"
            WHERE t.id = $1 AND t.status = 'ACTIVE'
            LIMIT 1
          SQL
          [params[:id]]
        ).first

        return render json: { error: { code: "NOT_FOUND", message: "Tour not found" } }, status: :not_found unless row

        images = tour_images(row["id"])
        rating = rating_for(:tour, [row["id"]])[row["id"]] || { average: nil, count: 0 }

        render json: {
          id: row["id"],
          title: row["title"],
          city: row["city"],
          country: row["country"],
          category: row["category"],
          pricePerPerson: numeric(row["pricePerPerson"]),
          durationDays: row["durationDays"].to_i,
          minGroupSize: row["minGroupSize"].to_i,
          maxGroupSize: row["maxGroupSize"].to_i,
          thumbnailUrl: images.find { |image| image[:isPrimary] }&.fetch(:url, nil) || images.first&.fetch(:url, nil),
          rating: rating,
          description: row["description"],
          cancellationHours: row["cancellationHours"]&.to_i,
          cancellationPolicy: row["cancellationPolicy"],
          images: images,
          itinerary: itinerary(row["id"]),
          inclusions: inclusions(row["id"]),
          availability: availability(row["id"]),
          host: {
            id: row["hostId"],
            name: row["host_name"],
            avatar: row["host_avatar"]
          },
          createdAt: row["createdAt"],
          updatedAt: row["updatedAt"],
          fallbackSource: "ruby-api"
        }
      end

      private

      def tour_images(tour_id)
        db.exec_params(
          <<~SQL,
            SELECT id, url, "isPrimary"
            FROM "TourImage"
            WHERE "tourId" = $1
            ORDER BY "isPrimary" DESC, id ASC
          SQL
          [tour_id]
        ).map do |row|
          {
            id: row["id"],
            url: normalize_upload_url(row["url"]),
            isPrimary: row["isPrimary"] == "t"
          }
        end
      end

      def itinerary(tour_id)
        db.exec_params(
          <<~SQL,
            SELECT id, "dayNumber", title, description
            FROM "TourItineraryDay"
            WHERE "tourId" = $1
            ORDER BY "dayNumber" ASC
          SQL
          [tour_id]
        ).map do |row|
          {
            id: row["id"],
            dayNumber: row["dayNumber"].to_i,
            title: row["title"],
            description: row["description"]
          }
        end
      end

      def inclusions(tour_id)
        rows = db.exec_params(
          <<~SQL,
            SELECT type, item
            FROM "TourInclusion"
            WHERE "tourId" = $1
            ORDER BY type ASC, item ASC
          SQL
          [tour_id]
        )

        {
          included: rows.select { |row| row["type"] == "INCLUDED" }.map { |row| row["item"] },
          excluded: rows.select { |row| row["type"] == "EXCLUDED" }.map { |row| row["item"] }
        }
      end

      def availability(tour_id)
        db.exec_params(
          <<~SQL,
            SELECT date, "slotsTotal", "slotsBooked"
            FROM "TourAvailability"
            WHERE "tourId" = $1 AND "isActive" = true
            ORDER BY date ASC
          SQL
          [tour_id]
        ).map do |row|
          slots_total = row["slotsTotal"].to_i
          slots_booked = row["slotsBooked"].to_i

          {
            date: row["date"],
            slotsTotal: slots_total,
            slotsBooked: slots_booked,
            slotsRemaining: slots_total - slots_booked
          }
        end
      end
    end
  end
end

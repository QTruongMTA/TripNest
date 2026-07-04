require "pg"
require "uri"

module FallbackDatabase
  extend ActiveSupport::Concern

  DEFAULT_DATABASE_URL = "postgres://postgres:123456@localhost:5432/tripnest"
  DEFAULT_PUBLIC_API_URL = "http://localhost:5001"

  private

  def db
    @db ||= PG.connect(ENV.fetch("DATABASE_URL", DEFAULT_DATABASE_URL))
  end

  def public_api_url
    ENV.fetch("NODE_PUBLIC_URL", DEFAULT_PUBLIC_API_URL).sub(%r{/+\z}, "")
  end

  def normalize_upload_url(url)
    return nil if url.nil? || url.to_s.strip.empty?

    value = url.to_s.strip
    parsed = URI.parse(value)

    if parsed.host&.match?(/\A(localhost|127\.0\.0\.1)\z/) && parsed.path.start_with?("/uploads/")
      return "#{public_api_url}#{parsed.path}"
    end

    value
  rescue URI::InvalidURIError
    value.start_with?("uploads/") ? "#{public_api_url}/#{value}" : value
  end

  def numeric(value)
    value.nil? ? nil : value.to_f
  end

  def integer_param(name, fallback, max: nil)
    value = params[name]
    parsed = value.present? ? value.to_i : fallback
    parsed = fallback if parsed <= 0
    max ? [parsed, max].min : parsed
  end

  def rating_for(kind, ids)
    return {} if ids.empty?

    foreign_key = kind == :property ? '"propertyId"' : '"tourId"'
    result = db.exec_params(
      <<~SQL,
        SELECT b.#{foreign_key} AS item_id,
               ROUND(AVG(r.rating)::numeric, 1)::float AS average,
               COUNT(r.id)::int AS count
        FROM "Booking" b
        JOIN "Review" r ON r."bookingId" = b.id
        WHERE b.#{foreign_key} = ANY($1)
        GROUP BY b.#{foreign_key}
      SQL
      [PG::TextEncoder::Array.new.encode(ids)]
    )

    result.each_with_object({}) do |row, memo|
      memo[row["item_id"]] = {
        average: numeric(row["average"]),
        count: row["count"].to_i
      }
    end
  end

  def image_map(table, foreign_key, ids)
    return {} if ids.empty?

    result = db.exec_params(
      <<~SQL,
        SELECT DISTINCT ON ("#{foreign_key}") "#{foreign_key}" AS item_id, id, url, "isPrimary"
        FROM "#{table}"
        WHERE "#{foreign_key}" = ANY($1)
        ORDER BY "#{foreign_key}", "isPrimary" DESC, id ASC
      SQL
      [PG::TextEncoder::Array.new.encode(ids)]
    )

    result.each_with_object({}) do |row, memo|
      memo[row["item_id"]] = {
        id: row["id"],
        url: normalize_upload_url(row["url"]),
        isPrimary: row["isPrimary"] == "t"
      }
    end
  end
end

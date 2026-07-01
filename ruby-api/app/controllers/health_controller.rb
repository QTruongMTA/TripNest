class HealthController < ApplicationController
  def show
    render json: {
      success: true,
      service: "TripNest Ruby on Rails API",
      status: "ok"
    }
  end
end

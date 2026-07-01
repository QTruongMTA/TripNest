require_relative "boot"

require "rails"
require "action_controller/railtie"

Bundler.require(*Rails.groups)

module TripNestRubyApi
  class Application < Rails::Application
    config.load_defaults 7.2
    config.api_only = true

    config.middleware.insert_before 0, Rack::Cors do
      allow do
        origins "*"
        resource "*",
                 headers: :any,
                 methods: [:get, :options]
      end
    end
  end
end

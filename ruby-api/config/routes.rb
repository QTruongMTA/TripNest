Rails.application.routes.draw do
  get "/health", to: "health#show"

  namespace :api do
    namespace :v1 do
      resources :properties, only: [:index, :show]
      resources :tours, only: [:index, :show]

      namespace :ruby do
        get "/travel_tips", to: "travel_tips#index"
      end
    end
  end
end

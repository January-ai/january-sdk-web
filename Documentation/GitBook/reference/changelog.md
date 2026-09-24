# Changelog

## 0.3.1 - 2026-09-24

* Fixed: `FoodPortion.selection` sent the portion's amount in the serving's unit as the number of servings, so a portion of a serving whose quantity isn't 1 (such as 6 oz or 100 g) was logged that many times over. It now sends the number of servings.
* Fixed: a request cancelled through its `signal` rejects with an `AbortError`, as documented, instead of a `JanuaryError` with category `transport`.
* Fixed: the React demo's food detail predicts glucose for the amount shown; it sent one 6 oz serving as six servings.
* The React demo logs the portion shown on a food's detail, and Tracking and Logs show each logged food as servings of its serving size, such as "1 × 6 oz".

## 0.3.0 - 2026-09-23

* **Upgrade required:** 0.2.0 and earlier can't read food logs from the current API, which now sends `created_at`
* Water logs with `waterLogs.create`, `list` (daily totals in a chosen unit), and `delete`, plus `VolumeUnit` (`fl_oz`, `ml`, and `cup`); the API accepts 0.1–101.4 cups
* Weight logs with `weightLogs.create` and `list` (latest weight per day)
* Food logs send and read the API's `created_at`, which replaces `eaten_at`; `timestampUtc` is unchanged. Water and weight logs use `created_at` too, as `consumedAt` and `measuredAt`
* Log list and summary `start` and `end` must be real calendar dates. An impossible date such as `2026-02-31` is rejected before any request, as a `JanuaryError` with category `transport` whose `cause` is a `TypeError`, instead of rolling into the next month
* `ServingSummary` and `ServingDetails` carry `weightGrams` and non-null `id` and `quantity`; `DetectedFood.id` and `quantity` are non-null
* Breaking: `AlternativeFood.id`, `RestaurantMenuEntry.id`, `LoggedFood.id`, and `ServingOption.id` are non-null strings, matching the current January API
* `foodLogs.update` sends only the fields you set and rejects an empty update
* `foodAnalysis.correct` forwards a scan field for field, including a serving weight when it has one
* A photo scan without `reasoningEffort` now uses the API's default, the reasoning-based analyzer; pass `'none'` for the standard one
* The React example adds a Tracking tab for meals, water, and weight with charts, food alternatives, and scan corrections

## 0.2.0 and earlier

* Breaking: `DetectedFood` exposes `serving` and `quantity` instead of `servings`, matching the current January API; `0.1.x` fails to decode photo scans and description analyses
* Food alternatives are `AlternativeFood` values with `servings: ServingSummary[]`
* Food-log summaries per day or week with `foodLogs.getSummary`
* Optional photo analysis effort with `ScanFoodPhotoRequest.reasoningEffort`
* Removed the unused `NaturalLanguageFood`, `NaturalLanguageServing`, and `NaturalLanguageFoodDetection` types
* Restaurant and menu-item searches accept the v1.2 radius range through 50,000 meters
* Typed Promise-based Web SDK for browser applications
* Provider-managed short-lived tokens with single-flight refresh
* Nine-attempt bounded exponential backoff with jitter
* AbortSignal support across public requests
* User-scoped foods, restaurants, food analysis, food logs, and glucose clients
* Food autocomplete, full food details with `foods.get`, and local portion calculations
* Browser photo preparation helper
* Browser voice transcription with live levels and duration, without retaining recorded audio
* Typed imperial and metric glucose-profile measurements
* Shared, white-label-ready React demo components
* Restaurant menu-item search, and paginated restaurant-menu lookup by restaurant ID (`getMenuItems`)
* Single food-log retrieval and no-content deletion aligned with API `v1.2`

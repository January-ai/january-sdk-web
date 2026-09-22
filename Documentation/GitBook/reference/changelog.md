# Changelog

## Unreleased

* Water logs with `waterLogs.create`, `list` (daily totals in a chosen unit), and `delete`, plus `VolumeUnit` (`fl_oz`, `ml`, and `cup`)
* Weight logs with `weightLogs.create` and `list` (latest weight per day)
* `ServingSummary` and `ServingDetails` carry `weightGrams` and non-null `id` and `quantity`; `DetectedFood.id` and `quantity` are non-null
* `foodLogs.update` sends only the fields you set and rejects an empty update
* `foodAnalysis.correct` forwards a scan field for field, including a serving weight when it has one
* The React demo adds a Tracking tab (one day's meals and totals, water, and weight) beside the Logs meal history
* The React demo's Tracking tab charts weight (line) and daily water (bars) over the last week, month, or year
* Breaking: `DetectedFood` exposes `serving` and `quantity` instead of `servings`, matching the current Partner API; `0.1.x` fails to decode photo scans and description analyses
* Food alternatives are `AlternativeFood` values with `servings: ServingSummary[]`
* Food-log summaries per day or week with `foodLogs.getSummary`
* Optional reasoning-based photo analysis with `ScanFoodPhotoRequest.reasoningEffort`
* Removed the unused `NaturalLanguageFood`, `NaturalLanguageServing`, and `NaturalLanguageFoodDetection` types
* Restaurant and menu-item searches accept the v1.2 radius range through 50,000 meters
* Typed Promise-based Web SDK for browser applications
* Provider-managed short-lived tokens with single-flight refresh
* Nine-attempt bounded exponential backoff with jitter
* AbortSignal support across public requests
* User-scoped Foods, Restaurants, Photo Scanning, Food Logs, and Glucose clients
* Food autocomplete, hydration, and local portion calculations
* Browser photo preparation helper
* Browser voice transcription with live levels and duration, without retaining recorded audio
* Typed imperial and metric glucose-profile measurements
* Shared, white-label-ready React demo components
* Paginated restaurant-menu lookup by restaurant ID, ready after backend deployment

Pin pre-release integrations to the version supplied by January.

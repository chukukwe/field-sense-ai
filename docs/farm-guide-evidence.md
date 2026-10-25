# Farm Guide evidence and review

Source review: 25 October 2026. This is a record of the implementation's evidence, not agronomist approval.

## Published sources

| Guidance | Source and scope | Application |
| --- | --- | --- |
| Cassava | [IITA, Agronomy of cassava, Research Guide 60 (1997)](https://cgspace.cgiar.org/items/e78b8dc2-da35-4306-9eeb-bae56727242a) | Healthy mature stem cuttings, adequate moisture, drainage, early weed control. Harvest depends on variety and conditions. No uniform planting or harvest date is inferred. |
| Maize | [NAERLS, planting date/time/method for SAMMAZ 63, updated May 2024](https://nfhl.naerls.gov.ng/index.php?action=faq&cat=24&id=4&artlang=en) | Established rains matter and timing varies across years and zones. The humid-zone month ranges in this variety-specific entry are not applied nationwide. |
| Plantain | [FARA, Innovation Opportunities in Plantain Production in Nigeria (2016), pp. 8–9](https://library.faraafrica.org/wp-content/uploads/2019/10/Guidebook-Plantain-production-in-Nigeria-rev.pdf) | Rainy-season establishment, moisture needs, timely field care, and crop/market-based maturity assessment. No LGA calendar rows are added from these broad observations. |
| Okra | [NAERLS, Okra agronomic practices](https://kms.naerls.gov.ng/variety/viewdetails/176) | Direct sowing, establishment checks, early replacement of failed stands, weeding, and tender-pod harvesting. This is not generic advice for every vegetable. |
| Seasonal climate | [NiMet seasonal outlook](https://nimet.gov.ng/scp?id=3), [2026 launch advisory](https://nimet.gov.ng/news?id=194) | Link farmers to the official outlook. Early showers do not establish rainy-season onset. The app retrieves the exact state/LGA/year seasonal rainfall record from the NiMet API. This is separate from the national advisory and from daily weather. |

The app's text is a concise paraphrase. Detailed spacing, pesticide and fertiliser prescriptions are not copied into a location-general plan.

## Calendar and locations

The existing dataset contains Nigeria's 36 states and FCT and 774 LGAs. Its LGA zone assignments are heuristic; 375 are flagged for additional review. All assignments remain described as approximate. Calendar rows remain draft, and none are promoted to verified by this release. Existing source strings describing general knowledge are not presented as authoritative citations.

The calendar shows possible planting windows and typical regional harvest windows, not instructions to plant or harvest now. Water choice defaults to rainfall only. Dry-season planting entries are omitted for that choice. Selecting reliable irrigation includes existing dry-season entries but does not establish crop suitability or guarantee water sufficiency. A missing entry means missing data, not that a crop cannot grow there. Harvest readiness must be assessed using planting date, variety, and actual crop condition.

## Behavior delivered

- Immediate local planning, without a simulated network/loading delay.
- Month selection and December-to-January rollover.
- Per-area water/crop choices saved on the current device, with graceful failure if storage is blocked.
- Crop care independent of calendar availability, including plantain and okra.
- Visible source scope, source-check date, and pending local agronomist review.
- General introduction notes for other existing crops remain labelled pending source review.
- Cached crop guidance remains local. The authenticated NiMet outlook calls the backend, which uses the private key. Source links require internet access.

## Remaining work requiring additional evidence

1. Review location-to-zone mappings against a licensed, authoritative agricultural-zone boundary dataset or local extension review. State-level descriptions cannot validate an LGA boundary.
2. Review every calendar row for crop, zone, season, production method, variety and source. National seasonal forecasts do not establish all of these facts.
3. Obtain agronomist/extension review before labelling guidance verified.
4. A live weather feature needs validated farm coordinates (with the farmer's consent), suitable provider terms, freshness/failure handling, and clear differentiation between forecasts and observations. LGA names or heuristic zones are not substituted for farm coordinates. No paid service, account, geolocation permission, or API key was added.
5. Expand crop-specific source coverage and planting-date-based crop management plans after variety and production-method review.

No claim is made that a forecast, agronomist review, or authoritative zone correction has been completed.

## NiMet integration verified

The existing private NIMET_API_KEY returned HTTP 200 from https://api.nimet.gov.ng/api/srp for Akwa Ibom / Eket / 2026. NiMet returned Eket and a partial-name match for Esit-Eket; only the exact area and year are used. Fields observed: onset, season_end, season_length, annual_rainfall, year, lga_name and state_name. FarmPal labels dates and totals as predictions, provides retrieval time, caches for at most 12 hours, and does not use these values to verify the draft calendar. The national-outlook redirect is removed from the plan. Daily forecasts and farm-coordinate weather remain future work.

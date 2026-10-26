# Farm Guide evidence and review

Updated 26 October 2026. Published-source checking is not independent agronomist approval or field validation.

## Latest audit

- All 774 location records were compared against the [NAERLS ecological-zone table](https://nfhl.naerls.gov.ng/index.php?action=faq&cat=1&id=1&artlang=en), last updated May 2024.
- The initial pass matched 755 LGAs directly and corrected 309 heuristic zone assignments. The remaining 19 are now resolved using official spelling evidence, source-default logic and explicitly labelled research corroboration/inference. See the resolution supplement; this is not a whole-farm boundary survey.
- Coastal classifications use the source's broad Humid Forest group. Rainforest/swamp/mangrove subzones are not inferred from a state or LGA name.
- All 277 legacy calendar rows lacked traceable authoritative citations and production-method/variety scope. They remain in the raw dataset for audit but are not served to farmers as reviewed recommendations.
- Replacement published planting windows currently cover maize and groundnut where the evidence supports the zone. Partial-month language is preserved. Variety, water and local conditions appear with every window.
- No source-reviewed harvest dates have been established; unsupported regional harvest-month claims are withheld.

Audit files: [all location decisions](farm-guide-location-audit.csv), [all legacy calendar decisions](farm-guide-calendar-audit.csv), [agronomist review pack](farm-guide-agronomist-review.md).

## Calendar sources

| Source | Evidence applied | Limits |
| --- | --- | --- |
| [IITA, Guide to Maize Production in Northern Nigeria (2020)](https://www.iita.org/wp-content/uploads/2020/07/Guide-to-Maize-Production-in-Northern-Nigeria.pdf), printed page 7 | Rain-fed maize windows for Southern Guinea, Northern Guinea and Sudan savannas | Established rains and suitable local variety required; not a current-year farm forecast. |
| [NAERLS, SAMMAZ 63 planting date](https://nfhl.naerls.gov.ng/index.php?action=faq&cat=24&id=4&artlang=en), May 2024 | Two humid-zone maize seasons | Explicitly restricted to the source's variety and zone. |
| [ICRISAT/FMARD, A Farmer's Guide to Profitable Groundnut Production in Nigeria (2015)](https://mel.cgiar.org/reporting/downloadmelspace/hash/MePOgapv/v/1ab63739a9086328bd998eb2238ab4d5), printed page 3 Table 1 and page 10 | Zone/variety-specific wet-season windows and conditional irrigated dry-season windows | Soil moisture, cold and irrigation constraints retained. No transfer of highland suitability is inferred. |

Source ages are displayed, not disguised as recent research. Calendar windows must still be checked against local conditions and expert advice.

## Care and seasonal prediction

General cassava care cites [IITA research guide 60](https://cgspace.cgiar.org/items/e78b8dc2-da35-4306-9eeb-bae56727242a); plantain care cites [FARA's Nigerian production guide](https://library.faraafrica.org/wp-content/uploads/2019/10/Guidebook-Plantain-production-in-Nigeria-rev.pdf); okra care cites [NAERLS](https://kms.naerls.gov.ng/variety/viewdetails/176). These sources do not establish a month-by-month calendar for every location.

The existing private NiMet key successfully returned the exact 2026 Eket record from the official seasonal rainfall API. The app matches state/LGA/year exactly and caches results for at most 12 hours. Retrieval time is distinguished from publication time. Rain onset/end and annual rainfall are predictions, not observed daily weather, and do not establish field readiness. No nearby location or older year is silently substituted.

## Outstanding independent review

Review the inference limits documented for the 19 resolved locations, particularly Ayamelum and the Ife/Ebonyi classifications. Obtain crop-specific published windows for the remaining crops, resolve conflicting evidence, and obtain qualified local review and field validation. No recommendation is labelled agronomist-verified. A ready-to-share checklist is in the review pack; no third party has been contacted.

## Resolved LGA supplement

[All 19 decisions and inspected evidence](farm-guide-location-resolutions.md). The location audit now distinguishes direct matches, name normalizations, source defaults, corroborated interpretations and external inference. All 774 IDs remain stable; Biriniwa is retained as an alias for Birniwa. No source inference is represented as an explicit NAERLS statement or independent expert sign-off.

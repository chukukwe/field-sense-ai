# FarmPal agricultural review pack

Prepared 26 October 2026. No independent agronomist approval has been obtained. Please review this material with a qualified Nigerian agronomist or agricultural extension officer before treating the calendar as field-validated.

## Material to review

- `farm-guide-location-audit.csv`: all 774 LGA classifications, old/new zones, source and review decision.
- `farm-guide-calendar-audit.csv`: all 277 legacy calendar rows. These rows lacked traceable evidence and are withheld from recommendations rather than relabelled verified.
- `src/data/farmGuideReviewedCalendar.ts`: the replacement published windows for maize and groundnut, including partial-month wording, variety and water requirements. No reviewed harvest dates are supplied.
- `src/data/farmGuidePlanning.ts`: general care text for cassava, maize, plantain and okra.

## Location questions needing clarification

| State | Database LGAs held for clarification | Problem in the NAERLS source |
| --- | --- | --- |
| Jigawa | Biriniwa; Malam Madori | Source spells these Birniwa and Malam-Maduri. Confirm identities and zones. |
| Katsina | Kankara; Kankia | Source names Kankari; do not guess which LGA is meant. |
| Zamfara | Tsafe | Source names Tsare. Confirm whether this refers to Tsafe. |
| Gombe | Shongom; Billiri | Source names Shangom and Billri. Confirm identities. |
| Kwara | Kaiama | Source names Kalama. Confirm whether this refers to Kaiama. |
| Osun | Atakunmosa East; Ife Central; Ife East; Ife North; Ife South | Source names Atakunmasa-East and Ife-Osun. Clarify the intended administrative areas. |
| Enugu | Aninri | Source names Aniri. Confirm identity. |
| Anambra | Ayamelum | Listed as an exception without a replacement zone; source spelling is Aghamelum. |
| Ebonyi | Izzi; Ishielu; Ohaukwu | Listed as exceptions without replacement zones. |
| Cross River | Bekwarra | Source names Bekwara. Confirm identity. |

All 19 locations keep an unresolved flag and receive no zone-based planting recommendations. A source match for the other 755 LGAs is not proof that every farm in that LGA has identical conditions. Coastal areas are classified only at the broad Humid Forest level supported by NAERLS; the app no longer guesses rainforest/swamp/mangrove subzones.

## Calendar sign-off checklist

For each crop and zone, record:

1. Rain-fed, supplemental irrigation or full irrigation, and field type (including upland/lowland rice where relevant).
2. Intended varieties and their maturity periods.
3. Planting start/end wording, including early/mid/late-month boundaries. Confirm whether the cited edition remains suitable today.
4. Minimum field conditions and how current NiMet predictions should inform a local decision. A forecast date is not an observed onset.
5. Harvest readiness based on planting date and maturity indicators, not a region-only month.
6. Source title, institution, edition/date, page/table, and any conflicts with another source.
7. Reviewer name, qualification, institution, review date, decision and corrections.
8. Any local field validation and its location, season and limitations.

Use a separate decision of `approved`, `revise`, or `insufficient evidence` per recommendation. Do not sign off an entire crop or country on the basis of one variety or one region.

## Priority gaps

The date calendar still needs crop-specific evidence for cassava, cowpea, Irish potato, millet, rice, sorghum, soybean, tomato and yam. Care guidance also needs further crop-specific review. Plantain and okra have general care guidance but no published local calendar in the current replacement dataset. No dates should be added merely to fill an empty month.

This document is prepared for the user to share. FarmPal has not contacted an expert or represented the app as independently certified.

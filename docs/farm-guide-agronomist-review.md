# FarmPal agricultural review pack

Prepared 26 October 2026. No independent agronomist approval has been obtained. Please review this material with a qualified Nigerian agronomist or agricultural extension officer before treating the calendar as field-validated.

## Material to review

- `farm-guide-location-audit.csv`: all 774 LGA classifications, old/new zones, source and review decision.
- `farm-guide-calendar-audit.csv`: all 277 legacy calendar rows. These rows lacked traceable evidence and are withheld from recommendations rather than relabelled verified.
- `src/data/farmGuideReviewedCalendar.ts`: the replacement published windows for maize and groundnut, including partial-month wording, variety and water requirements. No reviewed harvest dates are supplied.
- `src/data/farmGuidePlanning.ts`: general care text for cassava, maize, plantain and okra.

## Resolved location questions

The previous 19 held records have been resolved. See [the resolution supplement](farm-guide-location-resolutions.md) and the updated audit CSV. Source interpretation and external inference remain distinct from direct source matches.

Independent review should pay particular attention to the Ife group expansion, Kankara/Kankia distinction, ecological transition areas, and the extrapolation from sampled communities in Ayamelum and Ebonyi. No whole-farm boundary validation has been performed. Original IDs are stable and Biriniwa is retained as an alias for Birniwa.

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

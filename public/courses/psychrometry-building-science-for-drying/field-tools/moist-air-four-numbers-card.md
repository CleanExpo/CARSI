# Moist air four-numbers field card

**CARSI Building Science Foundations — field tool (Module 1)**
*DRAFT v1 for SME review. Australian and New Zealand jobs: 230 V / 50 Hz, metric units. Station pressure 1013.25 hPa unless you record your own.*

Log **all four numbers** at the same points, in the same order, every visit. RH alone cannot show water removal, because it changes with temperature.

| Date / time | Point | °C | %RH | e (hPa) | Dew point °C | g/kg | RH moved but g/kg did not? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| | Outside | | | | | | Yes / No |
| | Unaffected room | | | | | | Yes / No |
| | Affected room | | | | | | Yes / No |

## Formulas

- Saturation vapour pressure: es = 6.11 × 10^(7.5 T ÷ (237.3 + T)) hPa, T in °C
- Actual vapour pressure: e = (RH ÷ 100) × es
- Humidity ratio: w = 621.97 × e ÷ (P − e) g/kg, P in hPa
- Dew point: x = log10(e ÷ 6.11); Td = 237.3 x ÷ (7.5 − x)
- Imported units: 1 g/kg = 7.0 grains per pound

## Screen check

- [ ] Meter settled in this air for a couple of minutes before reading
- [ ] Unit set to °C and %RH, not °F or grains
- [ ] Hand calculation within 0.5 °C of the screen dew point

*These numbers describe the air. They are not a mould or exposure finding.*

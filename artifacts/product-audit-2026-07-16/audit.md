# Current Product Focus Audit

## Scope

Current first-screen entry into Puerto Rico planning context, captured from the
local demo on 2026-07-16.

## User Goal

Understand which conditions matter to establishing a business in Puerto Rico
and how those conditions change with operating scale and reach.

## Step 1 — Open the current planning screen

Health: **Needs refocus**.

Evidence: `01-current-home.png`.

Strengths:

- The product clearly identifies itself as Puerto Rico planning context.
- The map-first layout is appropriate for site-bound and travel-time evidence.
- Layer controls have visible text and accessible button labels.

UX risks:

- The entry point is a dataset-oriented layer list rather than a business-needs
  intake. The user is not asked about operating model, scale, reach, facilities,
  hiring, logistics, utilities, or launch constraints.
- Education occupies a parent layer plus four child layers; universities are
  enabled by default. This gives education more visual weight than its role in
  most location decisions warrants.
- Business layers are a short fixed category list and do not explain how the
  evidence relates to demand, competition, customers, suppliers, or market
  reach.
- The planning-context panel is unavailable in the static demo, so the
  end-to-end detail flow could not be audited from this capture.

Accessibility risks visible in the capture:

- Eye icons do not make on/off state visually obvious without learning the icon
  convention; button names provide better context to assistive technology than
  the visual affordance provides to sighted users.
- Contrast, focus order, keyboard operation, zoom reflow, and announced async
  state require runtime testing and cannot be confirmed from this screenshot.

## Highest-Impact Change

Replace the layer list as the primary task entry with a business operating
profile. Use the map and layers as progressive evidence after the product knows
which conditions are relevant and at what geographic reach. Keep university
data as optional evidence within workforce capability, not as a default-on
location signal.

## Evidence Limits

The capture used the repository's static demo fixture. It showed the university
layer and map controls, but the planning-context API was not available. This is
a bounded first-screen audit, not a full accessibility or end-to-end product
audit.

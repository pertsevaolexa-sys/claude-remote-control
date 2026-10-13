# Checking a sent newsletter, with filter clicks removed

Mailchimp's report mixes people with company mail-security tools (Microsoft Defender Safe Links, Mimecast, Proofpoint, Barracuda and similar). These tools open each incoming email and fetch every link to check it before the employee sees it, and Mailchimp records that as an open and a click. In October 2026 they made 91% of all clicks and Mailchimp's bot flag caught none. This file is how to get the real picture.

## When to check

- First look at 24 hours: opens and clicks are mostly in by then.
- Final read at 72 hours, or on the Tuesday after a Friday send, because a Friday send gets a second wave on Monday morning.
- Compare campaigns at the same age (for example, everything at 72 hours), not a 3-day-old send against older sends' lifetime totals.

## What to pull from Mailchimp

If the Mailchimp analytics connector is available, its `get_analytics` tool answers plain questions asynchronously: it returns a run id, and the result is read with `get_analytics_widget_data` once the run completes (usually 2–5 minutes). Ask for:

1. **Every clicking contact from raw click events**, not limited to the send day: email address, domain, click city/region/country, device, each URL with its click count, total clicks, first and last click timestamp. A first query in October covered only the send day and missed 23 later clickers; asking for raw click events across all days fixed it. Check that the rows add up to the campaign's unique clickers and total clicks.
2. **Per-link timing buckets**: unique clickers and clicks at 0–10 minutes, 10–60 minutes and after 60 minutes, for every tracked link.
3. **Opens by email domain** with delivered per domain, and **company versus personal domains**.
4. **Delivered, opened and open rate by profile country.**
5. **Bounces by domain and type.**

Ask for read-only analytics only; don't change anything in Mailchimp while checking.

## Classifying each clicking address

Apply in order; the first rule that matches wins. Measure time from the send time in Mailchimp's click data.

**Mail filter**
- Clicked 15 or more links, or every link, within the same second.
- Click location is a cloud data centre (Ashburn, Dulles or Boydton in Virginia; Boardman, Oregon; Columbus, Ohio; also Des Moines, San Antonio, Secaucus, Dublin and Frankfurt data centres when other signs agree), first click within 15 minutes, and 5 or more clicks.
- Click counts that are exact multiples of one scan pass shared with many other addresses (in October: Salmon Terra ×3 and de Bijenkorf ×2 per pass, so 5, 10, 15, 20 clicks).
- First click within 90 seconds and two or more different links within 5 seconds, from anywhere.
- Five or more clicks on four or more links within 2 seconds, at any time.

**Person**
- First click more than 60 minutes after sending, with no burst.
- First click within the hour, but outside data-centre cities and on one link, or on a phone, or on different links at least 30 seconds apart.
- One link clicked 2–3 times within 5 seconds a few minutes or more after sending: usually the person's click followed by the security tool re-checking it.

**Unclear**: anything with mixed signals. Report unclear addresses separately and give the people count as a range (people only, up to people plus unclear).

Sanity checks: people + unclear + filters must equal Mailchimp's unique clickers, and their clicks must add up to total clicks. If a filter address repeats its pass hours later, that can mean a person opened or forwarded the email; their own click may not be recorded, so don't move them to "person" without a click that breaks the pattern.

Opens cannot be classified this way: Mailchimp doesn't expose open times per contact in a usable form, and Apple Mail Privacy Protection opens look human. Use opens only for comparisons between groups (domains, countries) and to spot large firms with zero opens.

## What to report

1. **Funnel**: sent, bounced, delivered, opened, clicked (Mailchimp), clicked (people, with range).
2. **People's clicks by link**, sorted, with the Mailchimp total next to each so the gap is visible.
3. **People by country** (company country), and open rate by profile country.
4. **Large firms with zero or near-zero opens** (10+ delivered addresses), as a deliverability warning.
5. **Comparison with earlier sends at the same age.**
6. **Sales follow-up list**: every person who clicked, with company domain and the project or colour they opened, so sales can offer samples of the colours in that project within two working days. Keep this list internal: it contains personal addresses.

Don't search the web for private individuals behind personal addresses; give the user what Mailchimp holds and let them decide.

## Website truth

With Google Analytics link tracking on, compare email sessions per `utm_content` in GA4 with the people-only clicks. GA4 sessions are the better number for content decisions and A/B winners, because filters rarely load pages like a browser does.

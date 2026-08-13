# Workflow: i18n audit

Find Finnish copy on the public site that has no English translation, and fill
the gaps.

`scripts/i18n-audit.py` already does the detection — it compares the visible
Finnish strings on every public page against the entries in `i18n.js` and exits
1 when something is missing. Your job is to run it and close whatever it finds,
not to reimplement it.

## Steps

1. Run the audit:

   ```bash
   python3 scripts/i18n-audit.py
   ```

2. If it exits 0, stop. Report that coverage is complete and change nothing.

3. If it reports missing strings, add the English entries to `i18n.js`. Follow
   the key naming and file structure already there — find a neighbouring entry
   for the same page and match it.

4. Translate as Selora's own marketing copy would read: direct, concrete, no
   filler. Keep product names, prices, and technical terms exactly as they are
   in the Finnish. Do not invent claims that the Finnish does not make.

5. Re-run the audit and confirm it exits 0.

6. Run `python3 scripts/lang_audit.py` as well and confirm you have not
   introduced a new problem there.

## Boundaries

- Only touch `i18n.js`. If a fix would require editing an HTML page, stop and
  report what is needed instead of doing it.
- Never change the Finnish source strings. If the Finnish itself looks wrong,
  say so in your report and leave it alone.

## Report

State how many strings were missing, which pages they were on, and what you
added. If you stopped short of anything, say exactly what and why.

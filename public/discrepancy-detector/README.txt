Advisor contact file — Discrepancy Detector (NAAF / CRQ)
========================================================

WHAT THIS IS
------------
advisors.json is the list the Discrepancy Detector uses to look up which advisor
to address a deficiency email to. The tool reads it every time it is opened, so
an edit takes effect on the next page refresh. No developer or deployment is
needed to change it.

HOW THE LOOKUP WORKS
--------------------
The tool matches on the Rep Code from Section R of the NAAF first, because a
code is more reliable than a typed or handwritten name. If the rep code is blank
or is not in this file, it falls back to matching the advisor's name exactly.

The reviewer always confirms the advisor on screen before an email is drafted,
and if there is no confident single match they pick from a dropdown of everyone
in this file. Nothing is ever sent automatically.

HOW TO EDIT
-----------
Add one block per advisor, separated by commas, inside the square brackets.
Keep the quotation marks and commas exactly as shown.

[
  {
    "rep_code": "1234",
    "advisor_name": "Jane Doe",
    "email": "jdoe@firm.example"
  },
  {
    "rep_code": "5678",
    "advisor_name": "John Smith",
    "email": "jsmith@firm.example"
  }
]

RULES
-----
- rep_code      The advisor's rep code as it appears in Section R. Keep any
                leading zeros and put them inside the quotes ("0042", not 0042).
- advisor_name  Must match the NAAF spelling for the name fallback to work.
- email         Where the deficiency email is addressed.
- The last entry must NOT have a comma after its closing brace.
- Every advisor needs a name and an email. Entries missing either are skipped.

If the tool reports that the contact file could not be read, a comma or quotation
mark is usually missing. Paste the file into any JSON validator to find the line.

The sample entries above are placeholders. Replace them with the firm's real
advisors before using the tool for live reviews.

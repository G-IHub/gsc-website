// The 43 quality checks from the QA Checklist (draft), in its 11 sections. One checklist per review round.
// Placeholders like [20]% are the draft's figures still to be set by management.
export const QA_SECTIONS = [
  {
    "section": "Data",
    "items": [
      {
        "n": 1,
        "check": "Every dataset has its accession recorded, and each one opens",
        "how": "Open each accession or file; compare with the protocol list"
      },
      {
        "n": 2,
        "check": "Licence and use conditions allow this analysis and publication",
        "how": "Read the dataset's terms; note any attribution needed"
      },
      {
        "n": 3,
        "check": "Sample counts match the protocol and the manuscript",
        "how": "Compare counts in the data, the Methods and the Results"
      },
      {
        "n": 4,
        "check": "Inclusion and exclusion criteria applied as in the protocol",
        "how": "Check the code and the numbers excluded at each step"
      },
      {
        "n": 5,
        "check": "No personal or patient-identifiable data beyond what the Project Sheet allows",
        "how": "Scan the data files, figures and Source Data"
      }
    ]
  },
  {
    "section": "Reproducibility",
    "items": [
      {
        "n": 6,
        "check": "Analysis reruns from the raw data, from a clean state, without errors",
        "how": "Rerun the whole notebook top to bottom (Prompt Library: Reproducibility)"
      },
      {
        "n": 7,
        "check": "The rerun gives the same numbers as the manuscript",
        "how": "Compare every key result before and after the rerun"
      },
      {
        "n": 8,
        "check": "Software and versions are recorded",
        "how": "Check the software table against the code"
      },
      {
        "n": 9,
        "check": "Random seeds fixed where used; results do not change between runs",
        "how": "Run twice and compare"
      },
      {
        "n": 10,
        "check": "Code and notebook are complete and readable",
        "how": "Check comments and file names; nothing missing"
      }
    ]
  },
  {
    "section": "Number trace",
    "items": [
      {
        "n": 11,
        "check": "Every number in the Abstract, Results and tables is traced to a result and a file",
        "how": "Build the trace table: statement, result, file (Prompt Library: Number trace)"
      },
      {
        "n": 12,
        "check": "All primary results checked against the output; at least [20]% of the others sampled",
        "how": "Mark which were checked in the trace table"
      },
      {
        "n": 13,
        "check": "Rounding, units and sample sizes are consistent everywhere",
        "how": "Compare the text, tables, figures and legends"
      }
    ]
  },
  {
    "section": "Figures and tables",
    "items": [
      {
        "n": 14,
        "check": "Each figure and table matches the numbers in the text",
        "how": "Compare values and group sizes"
      },
      {
        "n": 15,
        "check": "Each figure has a title, labelled axes with units, and a clear legend",
        "how": "View at final size; check nothing is cropped or unreadable"
      },
      {
        "n": 16,
        "check": "Colours and labels are consistent and readable",
        "how": "Check in greyscale; check colour-blind-safe choices"
      },
      {
        "n": 17,
        "check": "Every figure has its Source Data file, and the file reproduces it",
        "how": "Open the Source Data and compare with the figure"
      }
    ]
  },
  {
    "section": "Statistics and interpretation",
    "items": [
      {
        "n": 18,
        "check": "Tests and thresholds are those in the protocol; any change is explained",
        "how": "Compare Methods with the protocol and its change log"
      },
      {
        "n": 19,
        "check": "Multiple-testing correction, effect sizes and confidence intervals are reported",
        "how": "Check the Methods and Results"
      },
      {
        "n": 20,
        "check": "Claims are no stronger than the data support; cause is not claimed from association",
        "how": "Read each Discussion claim against the result"
      },
      {
        "n": 21,
        "check": "Negative or unclear results are reported as found; limitations are stated",
        "how": "Check the Discussion and the limitations paragraph"
      }
    ]
  },
  {
    "section": "Methods and Results consistency",
    "items": [
      {
        "n": 22,
        "check": "Methods describe everything in Results, and nothing else",
        "how": "Cross-read the two sections (Prompt Library: Consistency check)"
      },
      {
        "n": 23,
        "check": "Deviations from the protocol are listed and explained",
        "how": "Check the change log against the manuscript"
      }
    ]
  },
  {
    "section": "References",
    "items": [
      {
        "n": 24,
        "check": "Every reference is verified: the DOI resolves and the title matches",
        "how": "Run the reference check and review each flagged item (Prompt Library: Reference check)"
      },
      {
        "n": 25,
        "check": "Each cited claim is actually supported by that paper",
        "how": "Spot-check at least [10] citations by reading the abstract (the DOI check does not test this)"
      },
      {
        "n": 26,
        "check": "No reference came from memory; all came from searches done in this project",
        "how": "Compare with the literature search record"
      },
      {
        "n": 27,
        "check": "Reference style matches the target journal",
        "how": "Check against the author instructions"
      }
    ]
  },
  {
    "section": "Text and originality",
    "items": [
      {
        "n": 28,
        "check": "Similarity (plagiarism) screening done; report attached; score and action recorded",
        "how": "Run the screening tool; read every flagged passage"
      },
      {
        "n": 29,
        "check": "No copied passages without quotation and citation",
        "how": "Compare flagged passages with their sources"
      },
      {
        "n": 30,
        "check": "Language is clear; scientific meaning is intact after editing",
        "how": "Read the whole text once, end to end"
      },
      {
        "n": 31,
        "check": "Format, sections and word limit match the target journal",
        "how": "Check the author instructions"
      }
    ]
  },
  {
    "section": "AI use and disclosure",
    "items": [
      {
        "n": 32,
        "check": "A statement of how AI tools were used is written",
        "how": "Check the wording against what was really done"
      },
      {
        "n": 33,
        "check": "The statement matches the target journal's AI policy",
        "how": "Read the journal's current policy; record the date"
      },
      {
        "n": 34,
        "check": "AI tools are not listed as authors",
        "how": "Check the author list"
      },
      {
        "n": 35,
        "check": "A human reviewed every section; no unreviewed AI text remains",
        "how": "Confirm with the lead; read for generic or unsupported passages"
      },
      {
        "n": 36,
        "check": "If an AI-detection tool was used, its score is treated as advisory only",
        "how": "Record the score; do not decide on it alone"
      }
    ]
  },
  {
    "section": "Authorship, ethics and statements",
    "items": [
      {
        "n": 37,
        "check": "The author list and order match the Project Sheet; Genomac co-authors are all present",
        "how": "Compare the manuscript with the Project Sheet and the close-out authors table"
      },
      {
        "n": 38,
        "check": "Any author added by the client meets the journal's criteria",
        "how": "Ask the client; record the contribution"
      },
      {
        "n": 39,
        "check": "Ethics, consent, data availability, funding and conflict-of-interest statements are present and true",
        "how": "Check each statement against the protocol and the Project Sheet"
      },
      {
        "n": 40,
        "check": "Acknowledgements are agreed with the people named",
        "how": "Confirm with each person"
      }
    ]
  },
  {
    "section": "Client package",
    "items": [
      {
        "n": 41,
        "check": "All files are present: manuscript, figures, tables, Source Data, protocol, software record, AI-use statement",
        "how": "Check the list against the delivery tick-list in the close-out form"
      },
      {
        "n": 42,
        "check": "No internal notes, comments, tracked changes, costs or file paths remain",
        "how": "Inspect the files and their properties"
      },
      {
        "n": 43,
        "check": "Files are named clearly and open correctly in Word and in a viewer",
        "how": "Open each one"
      }
    ]
  }
];
export const QA_CHECK_NUMBERS = QA_SECTIONS.flatMap((s) => s.items.map((i) => i.n));

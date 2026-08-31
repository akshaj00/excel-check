# Excel Compare Hub

Build a simple web application called Excel Cross Verification Tool.

Purpose

The application will be used to cross-check data between two Excel files:

Main File — An Excel file containing data for multiple projects.

Project File — An Excel file containing data for a single project.

The actual Excel processing and comparison rules will be implemented in the backend later.

For now, the frontend should only handle:

Uploading the two files

Sending them to the backend

Displaying the comparison results returned by the backend

Do NOT implement any comparison logic in the frontend.

Page Layout

Create one simple main page.

Header

Display:

Excel Cross Verification

Subtitle:

Compare project data against the main project database

Keep the header simple and professional.

File Upload Section

Display two upload cards vertically.

1. Main Excel File

Label:

Main Excel File

Description:

"Upload the Excel file containing data for all projects."

Provide:

Drag-and-drop area

Browse Files button

Accept .xlsx and .xls

Display the selected filename

Display file size

Remove/replace file option

2. Project Excel File

Label:

Project Excel File

Description:

"Upload the Excel file containing data for the project to be verified."

Provide:

Drag-and-drop area

Browse Files button

Accept .xlsx and .xls

Display the selected filename

Display file size

Remove/replace file option

Make it visually obvious which file is the Main File and which is the Project File.

Verify Button

Below the two upload sections, add one primary button:

Start Cross Verification

The button should:

Be disabled until both files are selected.

Show a loading state after being clicked.

Display:

Cross verifying...

while waiting for the backend response.

The frontend should send both files to the backend through a single API request.

Keep the API integration isolated in a separate service/function so the backend endpoint can easily be changed later.

For example:

POST /api/compare

with:

main_file

project_file

Do not hardcode the backend URL. Keep it configurable through an environment variable.

Results Section

After the backend returns the comparison result, display the results on the same page.

The frontend should NOT assume what fields are being compared.

The backend will determine:

What needs to be compared

Which values match

Which values differ

Which values are missing

What changes were detected

The frontend should simply display the result returned by the backend.

Result Summary

At the top of the results section display a simple summary:

Cross Verification Result

Show:

Total comparisons

Matches

Changes / Differences

Missing values

Example:

Cross Verification Result

Total Checked     25
Matched           21
Changes            3
Missing            1


Changes / Differences

The most important section is:

Changes Found

Display the changes in a clean table.

Example:

FieldMain FileProject FileStatusProject NameABC ProjectABC ProjectMatchManagerRahulAkhilChangedLocationMangaloreKannurChangedBudget500000—Missing

The actual fields and values will come from the backend.

Use clear visual indicators:

Green → Match

Red → Changed

Yellow/orange → Missing

If there are no changes, display:

✓ No differences found

Backend Response Flexibility

Design the frontend so that the backend can return a structured JSON response.

For example:

{
  "summary": {
    "total": 25,
    "matched": 21,
    "changed": 3,
    "missing": 1
  },
  "results": [
    {
      "field": "Manager",
      "main_value": "Rahul",
      "project_value": "Akhil",
      "status": "changed"
    },
    {
      "field": "Location",
      "main_value": "Mangalore",
      "project_value": "Mangalore",
      "status": "matched"
    }
  ]
}


This is only an example structure. Keep the frontend comparison-result component modular so the backend response structure can be adjusted later.

Error Handling

Display clear messages for:

No files selected

Invalid file type

Backend/server error

Failed comparison

Empty comparison result

Example:

Verification failed

"Unable to process the files. Please try again."

Provide a Try Again button.

Reset

After results are displayed, provide:

New Verification

Clicking it should clear:

Main file

Project file

Previous results

Error messages

and return the interface to the initial upload state.

Design

Keep the design extremely simple.

This is an internal utility, NOT a marketing website.

Use:

Clean white/light background

Simple cards

Professional typography

Minimal colors

Subtle borders

Clear spacing

Responsive layout

Simple icons where useful

Do not add:

Landing page

Pricing

Login/signup

User profiles

Analytics dashboard

Comparison history

Settings

Unnecessary animations

Complex navigation

The entire application can be a single page.

Final User Flow

The complete flow should be:

Open application

↓

Upload Main Excel File

↓

Upload Project Excel File

↓

Click "Start Cross Verification"

↓

Loading: "Cross verifying..."

↓

Backend processes the files

↓

Frontend receives comparison results

↓

Display changes/differences clearly

↓

User clicks "New Verification" to repeat

Important

Do not build Excel comparison logic in the frontend.

Do not make assumptions about which columns need to be compared.

The backend will contain all comparison rules later.

The frontend should act only as:

File Upload → API Request → Display Backend Results

Keep the code modular so the backend can be connected or modified later without redesigning the UI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://excel-check-mate.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/259ebdd0-e5c2-4268-8d99-6403e8cefe51).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

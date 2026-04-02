/**
 * Artwork Archive CSV column registry.
 * These are the fixed AA import template columns — we cannot change them.
 * Source: ArtworkArchive-ContactsImportTemplate.xlsx (40 cols)
 *         ArtworkArchive-CollectorOrgVersionPieceImportTemplate.xlsx (69 cols)
 * Updated 2026-04-02 from April 2026 templates (mid-January 2026 revision).
 */

export interface AAColumn {
  index: number
  name: string
  helperText: string
  entityType: "artist" | "artwork"
}

// ─── Contacts / Artists (40 columns) ─────────────────────

const ARTIST_HEADERS = [
  "First Name / Company Name",
  "Last Name",
  "Title",
  "Nationality",
  "Birth Date",
  "Death Date",
  "Email",
  "Secondary Email",
  "Phone",
  "Mobile Phone",
  "Work Phone",
  "Primary Address 1",
  "Address 2",
  "City",
  "State",
  "Zip",
  "Country",
  "Secondary Address 1",
  "Address 2",
  "City",
  "State",
  "Zip",
  "Country",
  "Notes",
  "Bio",
  "Website",
  "Company / Organization",
  "Job Title",
  "Artist",
  "Appraiser",
  "Groups",
  "Spouse First Name",
  "Spouse Last Name",
  "Contact Tags",
  "Contact Image Url",
  "Instagram Url",
  "Facebook Url",
  "Twitter Url",
  "LinkedIn Url",
  "Pinterest URL",
] as const

const ARTIST_HELPER_TEXT = [
  "Required",                                          // 0  First Name / Company Name
  "",                                                  // 1  Last Name
  "eg: Mrs. , Mr. , etc",                              // 2  Title
  "",                                                  // 3  Nationality
  "",                                                  // 4  Birth Date
  "",                                                  // 5  Death Date
  "",                                                  // 6  Email
  "",                                                  // 7  Secondary Email
  "",                                                  // 8  Phone
  "",                                                  // 9  Mobile Phone
  "",                                                  // 10 Work Phone
  "Primary",                                           // 11 Primary Address 1
  "Primary",                                           // 12 Address 2
  "Primary",                                           // 13 City
  "Primary",                                           // 14 State
  "Primary",                                           // 15 Zip
  "Primary",                                           // 16 Country
  "Secondary",                                         // 17 Secondary Address 1
  "Secondary",                                         // 18 Address 2
  "Secondary",                                         // 19 City
  "Secondary",                                         // 20 State
  "Secondary",                                         // 21 Zip
  "Secondary",                                         // 22 Country
  "",                                                  // 23 Notes
  "",                                                  // 24 Bio
  "",                                                  // 25 Website
  "",                                                  // 26 Company / Organization
  "",                                                  // 27 Job Title
  "yes or no (blank)",                                 // 28 Artist
  "yes or no (blank)",                                 // 29 Appraiser
  "Comma sepearted list of groups",                    // 30 Groups (sic — AA's typo)
  "",                                                  // 31 Spouse First Name
  "",                                                  // 32 Spouse Last Name
  "Comma seperated list",                              // 33 Contact Tags (sic — AA's typo)
  "",                                                  // 34 Contact Image Url
  "Must be the full public URL to their profile, not just the username", // 35 Instagram
  "Must be the full public URL to their profile, not just the username", // 36 Facebook
  "Must be the full public URL to their profile, not just the username", // 37 Twitter
  "Must be the full public URL to their profile, not just the username", // 38 LinkedIn
  "Must be the full public URL to their profile, not just the username", // 39 Pinterest
] as const

// ─── Pieces / Artworks (69 columns) ─────────────────────

const ARTWORK_HEADERS = [
  "Piece Name",
  "Artist First Name",
  "Artist Last Name",
  "Inventory Number",
  "Medium",
  "Type",
  "Status",
  "Height",
  "Width",
  "Depth",
  "Dimension Override",
  "Paper Height",
  "Paper Width",
  "Framed",
  "Framed Height",
  "Framed Width",
  "Framed Depth",
  "Subject Matter",
  "Price",
  "Fair Market Value",
  "Wholesale Value",
  "Insurance Value",
  "Creation Date",
  "Circa",
  "Creation date override",
  "Description",
  "Tags",
  "Notes",
  "Collections",
  "Current Location Name",
  "Current Location Start Date",
  "Current Location End Date",
  "Sub Location Name ",
  "Tertiary Location Name",
  "Location Record Notes",
  "Location Record Longitude",
  "Location Record Latitude",
  "Sale/Donation/Gift",
  "Sale Location",
  "Sale/Donation/Gift Date",
  "Sale/Donation/Gift Price",
  "Sale Discount",
  "Sale Commission",
  "First Name/Company Name of who you sold/donated/gifted to",
  "Last Name of who you sold/donated/gifted to",
  "Acquisition: Purchase Price",
  "Acquisition: Purchase Date",
  "Acquisition: Purchase Location",
  "Acquisition:  Purchase from First Name/Company Name",
  "Acquisition: Purchase From Last Name",
  "Acquisition: Donation Date",
  "Acquisition: Donation Value",
  "Acquisition: Donor First Name/Company Name",
  "Acquisition: Donor Last",
  "Attribution Line",
  "Signed",
  "Signature Notes",
  "Edition",
  "Edition Info",
  "Appraisal Date",
  "Appraisal Value",
  "Appraiser First Name",
  "Appraiser Last Name",
  "Condition Status",
  "Condition Notes",
  "Weight",
  "Provenance",
  "Piece Image Filename or URL",
  "Additional File Filename or URL",
] as const

const ARTWORK_HELPER_TEXT = [
  "Name of artwork goes here",                         // 0  Piece Name
  "",                                                  // 1  Artist First Name
  "",                                                  // 2  Artist Last Name
  "Leave blank unless you have your own inventory or ID system", // 3  Inventory Number
  "Medium information goes here",                      // 4  Medium
  "USE ONE OF THE FOLLOWING: Book, Ceramic, Collage, Digital, Drawing, Fiber, Film/Video, Furniture, Garment, Glass, Illustration, Installation, Jewelry, Metalwork, Mixed Media, Mosaic, Mural, New Media, Other, Painting, Performance, Photography, Print, Sculpture, Textile, Wood, Work on Paper", // 5  Type
  "USE ONE OF THE FOLLOWING: in_progress, available, reserved, donated, gifted, sold, not_for_sale, on_loan, installed, in_storage, in_transit, under_maintenance, work_destroyed, lost, stolen, deaccessioned, returned_to_owner", // 6  Status
  "Enter Number Only: default is inches.  Specify if cm", // 7  Height
  "Enter Number Only: default is inches.  Specify if cm", // 8  Width
  "Enter Number Only: default is inches.  Specify if cm", // 9  Depth
  'Use this if your dimensions do not fit into h/w/d format. This can be any text string such as "12 inch diameter"', // 10 Dimension Override
  "Enter Number Only: default is inches.  Specify if cm", // 11 Paper Height
  "Enter Number Only: default is inches.  Specify if cm", // 12 Paper Width
  "Mark Yes or No",                                    // 13 Framed
  "Enter Number Only: default is inches.  Specify if cm", // 14 Framed Height
  "Enter Number Only: default is inches.  Specify if cm", // 15 Framed Width
  "Enter Number Only: default is inches.  Specify if cm", // 16 Framed Depth
  "Enter subject matter here",                         // 17 Subject Matter
  "Add retail price here",                             // 18 Price
  "Add FMV here",                                      // 19 Fair Market Value
  "Add wholesale price here",                          // 20 Wholesale Value
  "Add inurance value here",                           // 21 Insurance Value (sic — AA's typo)
  "Date work was created  Format as:mm/dd/yyyy. If just year use yyyy", // 22 Creation Date
  "If the date is Circa, mark yes here",               // 23 Circa
  'Use this if you want the creation date to display something other than a year. For exmaple "19th Century"', // 24 Creation date override (sic — AA's typo)
  "Description of the artwork goes here",              // 25 Description
  "Comma separated list of Tags",                      // 26 Tags
  "",                                                  // 27 Notes
  "Comma separated list of collections",               // 28 Collections
  "This is where the work is currently located. This is NOT where you enter who you sold the work to.  That is done in later columns", // 29 Current Location Name
  "Format as:mm/dd/yyyy. If just year use yyyy",       // 30 Current Location Start Date
  "Format as:mm/dd/yyyy. If just year use yyyy",       // 31 Current Location End Date
  "Only available for Organization accounts",          // 32 Sub Location Name
  "Only available for Organization accounts",          // 33 Tertiary Location Name
  "Notes on this location record",                     // 34 Location Record Notes
  "Only available for Organization accounts. Only enter if GPS location is different from the location address", // 35 Location Record Longitude
  "Only available for Organization accounts. Only enter if GPS location is different from the location address", // 36 Location Record Latitude
  '*Only use if you or your organization sold/donated/gifted the work.This is used to capture sales, donations and giftings of your work.  The options for this column are "sale", "donation", "gift" or leave blank.', // 37 Sale/Donation/Gift
  "If sold from a location, you can list that here.",   // 38 Sale Location
  "Format as:mm/dd/yyyy. If just year use yyyy",       // 39 Sale/Donation/Gift Date
  "Amount the work was sold for",                      // 40 Sale/Donation/Gift Price
  "Discount off the sale price (In currency units)",   // 41 Sale Discount
  "Commission taken off the sale price (In currency units)", // 42 Sale Commission
  "Use this to record the first name or company name of the buyer or recipient", // 43 Sold/Donated/Gifted to First Name
  "Use this to record the last name of the buyer or recipient", // 44 Sold/Donated/Gifted to Last Name
  "Amount the work was purchased for",                 // 45 Acquisition: Purchase Price
  "Date work was purchased: mm/dd/yyyy",               // 46 Acquisition: Purchase Date
  "The name of the location that you purchased the work", // 47 Acquisition: Purchase Location
  "The first name or company name of who you purchased from", // 48 Acquisition: Purchase from First Name
  "The last name of the person you purchased from",    // 49 Acquisition: Purchase From Last Name
  "Date work was donated to you: mm/dd/yyyy",          // 50 Acquisition: Donation Date
  "Value of donated work.",                            // 51 Acquisition: Donation Value
  "The first name or company name of the person who donated this to you.", // 52 Acquisition: Donor First Name
  "Last name of the person or company who donated this to you.", // 53 Acquisition: Donor Last
  "Place to acknowledge the donation or gift. Example: In memory of John Smith", // 54 Attribution Line
  "Mark Yes or No",                                    // 55 Signed
  "Details on where the signature is located.",         // 56 Signature Notes
  "Mark yes if this work is part of an Edition",       // 57 Edition
  "Provide edition related details here (i.e. 1/10)",  // 58 Edition Info
  "Date of the appraisal: mm/dd/yyyy",                 // 59 Appraisal Date
  "Price of appraisal",                                // 60 Appraisal Value
  "First name of appraiser goas here",                 // 61 Appraiser First Name (sic — AA's typo)
  "Last name of appraiser goes here",                  // 62 Appraiser Last Name
  "Use one of the following:Excellent, Good, Fair, Poor, Very Poor", // 63 Condition Status
  "Detailed condition notes go here",                  // 64 Condition Notes
  "Weight of piece",                                   // 65 Weight
  "The history of ownership for this work of art.",    // 66 Provenance
  'Add the FULL filename or URL path to the image file.  NOTE: You can add up to 30 additional Image filenames or URLs in this column separated by pipe character "|". The first image listed will be the Primary Image for your piece record.', // 67 Piece Image Filename or URL
  'Add the FULL filename or URL path. Multiple URLs in this column should be separated by pipe character "|".', // 68 Additional File Filename or URL
] as const

// ─── Build typed column arrays ──────────────────────────

function buildColumns(
  headers: readonly string[],
  helperTexts: readonly string[],
  entityType: "artist" | "artwork",
): AAColumn[] {
  return headers.map((name, index) => ({
    index,
    name,
    helperText: helperTexts[index] ?? "",
    entityType,
  }))
}

export const AA_ARTIST_COLUMNS = buildColumns(ARTIST_HEADERS, ARTIST_HELPER_TEXT, "artist")
export const AA_ARTWORK_COLUMNS = buildColumns(ARTWORK_HEADERS, ARTWORK_HELPER_TEXT, "artwork")
export const ALL_AA_COLUMNS = [...AA_ARTIST_COLUMNS, ...AA_ARTWORK_COLUMNS]

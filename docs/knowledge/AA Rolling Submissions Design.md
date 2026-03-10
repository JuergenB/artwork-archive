# AA Rolling Submissions Design

> We are working for a non-profit organization that allows artists to submit their work on a variety of different websites and for a variety of different exhibitions. Our non-profit organization, called arterial.org, is accepting these submissions for a number of purposes, such as:   
> Occasional grants  
> Launching online exhibitions through our artwork archive exhibition platform  
> Curating for specific exhibitions for websites like not real art or artsville usa  
> These artist submissions come in from a platform called paper form. Part of the issue we are addressing by building the system is that paper form allows an artist to submit up to five pieces of artwork, but it creates only one single record. Whereas our online exhibition platform, which is called Artwork Archive, requires separate records for artists as opposed to the artworks submitted, so one artist record and five artwork records, for example.  
>   
> The entire system will also enrich the submissions received by using a number of AI agents that are running through n8n automations and will research the artists, their biographies, the background, will interpret images, create tags, medium, and other value-added information that we will store in our Airtable.  
>   
> Once a month or so, we want to be able to take any pending artworks and artist records and convert these into Artwork Archive compatible format and export these as.csv files that will be imported on the Artwork Archive platform so that we can launch our online exhibitions for them.  
>   
> The platforms and workflows involved are:   
> Artists submit their work through paper form, which triggers n8n automations that split the artworks and the artist and create a permanent record on the Airtable system, as well as add submissions to secondary platforms like ActiveCampaign.  
> The Airtable system will eventually also log imports, exports, and where the actual artworks are stored on Google or Dropbox, as well as handle Slack notifications and email notifications to the people that need to know.  
> This document is an attempt at documenting the Airtable layouts and system design in general.  
>   
## Platforms

### Paperform

### Airtable

### n8n

### Active Campaign

### Storage (Google, Dropbox)

### Slack

## Airtable Data Design

> The base should be named "AA Rolling Submissions".  This stands for Artwork Archive Rolling Submissions.   
>   
### Base Information and Concept

> We are creating an AirTable base to handle artist submissions of artworks. Artist submissions will take the form of imports, and all data to this Airtable will be added by n8n Automations. The purpose of the system is to track incoming artist submissions as well as their artwork, and eventually also track occasional exports.   
>   
> These artworks are being submitted on a paper form platform, and added to Airtable via API, through an n8n Automation. Each artist an submit up to five pieces of artwork.   
>   
> We will need the following tables.   
> Artists: we will need an artist table that links to related artworks.   
> Artworks: we will need a table to store the artworks being submitted.   
> Campaigns: the concept of a campaign is to categorize the incoming artist and artwork submissions from Paperform. We are designing a process to accept submissions for a variety of purposes and for multiple websites or exhibitions. Campaigns represent these exhibitions, websites, or themed submissions.   
> Import Logs: records to the air table will be added via API through n8n after artists submit work using paper form. The job of import logs is to track every time an import occurs and has added new records to the artist, artworks, and campaign tables.   
> Export Logs: the entire purpose of this system is to gather artists and submissions, and then once a month or so generate an export to our main online exhibition platform called Artwork Archive. The data from the artist submissions as well as from the artworks will be packaged up and exported as CSV files. The job of the export logs is to track whenever that happens successfully.   
>   
### Table: Artists

> This is the Primary Artist Archive in Airtable.  The idea is to match this with artists we store in Artwork Archive, but also to provide valuable information and research about the artist for generating social media posts and other valuable assets. I'm making an attempt to have (AI) as a suffix naming convention for any value-added AI-generated fields.   
>   
- First Name
  
  > Artist's first name is entered on paper form.   
  >   
- Last Name
  
  > Artist last name as entered on paper form.   
  >   
- Title
  
  > Optional title   
  >   
- Nationality
  
  > Optional nationality.   
  >   
- Email
  
  > Required artist email field. This is the field that should link to related artworks, belonging to the artist as well.   
  >   
- Primary Address
  
  > Primary Street Address   
  >   
- Address 2
  
  > Primary Street Address, 2nd Field   
  >   
- City
  
  > City for the primary address   
  >   
- State
  
  > State abbreviation for the primary address.   
  >   
- Zip
  
  > Zip code for the primary address.  
  >   
- Country
  
  > Country of the primary address   
  >   
- Notes
  
  > The notes field is used to concatenate certain information about the artist. For example, an artist statement might be put here, combined with other information about the artist. This is a field we will use to export to Airtable, but not a field that will be on the paper form itself.   
  >   
- Bio
  
  > Artist short biography field as entered on paper form.   
  >   
- Artist Statement
  
  > The artist statement field will be on the paper form, but it is not part of the export format for Airtable import. Instead, we will add the artist statement to a section in the notes field.   
  >   
- Contact Image URL
  
  > The artist headshot and the image URL can come from the paper form uploaded file.   
  >   
- Website
  
  > Artist's primary website URL.   
  >   
- Instagram URL
  
  > Artist Instagram URL   
  >   
- Facebook URL
  
  > Artist Facebook URL   
  >   
- Twitter URL
  
  > Artist Twitter URL   
  >   
- LinkedIn URL
  
  > Artist LinkedIn URL   
  >   
- Pinterest URL
  
  > Artist Pinterest URL   
  >   
- Capture value added info (AI)
  
  > We want to capture things like:   
  > AI-generated research information about the artist  
  > AI generated tags for search and classifications  
  >   
- Related Artworks
  
  > This will be an automatically generated field to store the related artworks, so that the interface can display an artist and then their related list of works.   
  >   
- Related Campaigns
  
  > This would be an automatically generated, related campaign so that we can open a campaign. For example, "Not Real Art Exhibition A," and see all the artists associated with it. Or open an artist profile and see all the exhibitions that work had been submitted to.   
  >   
- Status
  
  > The status field will be either  
  > Pending  
  > Exported  
  > It should track what artists are pending versus have been exported to the artwork archive. When our n8n automations filter, they can find and process only pending artists and ignore the ones that have already been exported.   
  >   
- Date Imported
  
  > When a paper form submission is processed, this should be the date on which the artist data submission was imported.   
  >   
- Date Exported to AA
  
  > Once pending artists and their pieces have been exported and processed successfully at Artwork Archive, we then will record the date that the artworks and artists were exported to AA (Artwork Archive)   
  >   
### Table: Artworks

> The Artworks table stores artworks being submitted, links them back to the artist, also links back to the related campaign the artwork belongs to or was submitted for, and tracks the import and eventual export status.   
>   
- Piece Name
  
  >  Name of artwork goes here  
  >   
- Artist First Name
  
  > A lookup of the artist first name from the artist table  
  >   
- Artist Last Name
  
  > A lookup of the artist's last name from the artist table.   
  >   
- Medium
  
  > The medium used for the piece, artists can enter this freely, but should be the materials, like acrylic paint on canvas or gelatinous silver print for a photograph, for example.   
  >   
- Medium (AI)
  
  > The medium detected and analyzed by AI, since often artists forget to enter this.   
  >   
- Type
  
  > The type of art being imported, for example   
  >   
  > USE ONE OF THE FOLLOWING: Book, Ceramic, Collage, Digital, Drawing, Fiber, Film/Video, Furniture, Garment, Glass, Illustration, Installation, Jewelry, Metalwork, Mixed Media, Mosaic, Mural, New Media, Other, Painting, Performance, Photography, Print, Sculpture, Textile, Wood, Work on Paper  
  >   
  > In Airtable, we should not constrain this, but rather provide a drop-down in the original paper form submission.   
  >   
- Height
  
  > Enter Number Only: default is inches.  Specify if cm  
  >   
- Width
  
  > Enter Number Only: default is inches.  Specify if cm  
  >   
- Depth
  
  > Enter Number Only: default is inches.  Specify if cm  
  >   
- Subject Matter
  
  > The subject matter of the piece is entered by the artist.   
  >   
- Subject Matter (AI)
  
  > Subject Matter of the piece as detected by AI   
  >   
- Price
  
  > Retail price of the piece as entered by the artist.   
  >   
- Creation Date
  
  > Should likely be a string and not a date field. It is for the Date the piece was created  Format as: mm/dd/yyyy. If just year use yyyy.  
  >   
- Description
  
  > Description of the piece as entered by the artist   
  >   
- Description (AI)
  
  > Description of the piece as detected by AI   
  >   
- Tags
  
  > Tags for the piece as entered by the artist   
  >   
- Tags (AI)
  
  > Tags of the piece as detected by AI   
  >   
- Notes
  
  > Long text field for notes about the piece.   
  >   
- Collections
  
  > Collections are an artwork archive grouping that should correspond to the campaign associated with the submission and piece.   
  >   
- Provenance Info
  
  > History of Ownership for the Peace   
  >   
- Piece Image URLs
  
  > URL path to the image file.    
  >   
  > NOTE: You can add up to 10 additional Image URLs in this column separated by pipe character "|". The first image URL listed will be the Primary Image for your piece record.   
  >   
- Additional File URLs
  
  > URL path to the file. Mutliple URLs in this column should be separated by pipe character "|".   
  >   
- Related Campaign Name
  
  > Related Campaign Name that the piece was submitted for. The related campaign name will be added to the collections column as well.   
  >   
- Status
  
  > The status field will be either  
  > Pending  
  > Exported  
  > It should track what submissions, artworks, and artists are pending versus have been exported to the artwork archive. When our n8n automations filter, they can find and process only pending artworks and ignore the ones that have already been exported.   
  >   
- Date Imported
  
  > When a paper form submission is processed, this should be the date on which the submission was imported.   
  >   
- Date Exported to AA
  
  > Once pending submissions have been exported and processed successfully at Artwork Archive, we then will record the date that the artworks and artists were exported to AA (Artwork Archive)   
  >   
### Table: Campaigns

> The concept of a campaign is to categorize the incoming artist and artwork submissions from Paperform. We are designing a process to accept submissions for a variety of purposes and for multiple websites or exhibitions. Campaigns represent these exhibitions, websites, or themed submissions. Campaigns will be added via our n8n automation.   
>   
- Campaign Name
  
  > Not Real Art - General  
  > Artsville USA - General  
  > Arthouse - General  
  > Not Real Art - Exhibition A  
  > Not Real Art - Exhibition B  
  >   
  >   
- Campaign Contact
  
  > Campaign contacts are the people that need to be notified when a new import occurs or anything else happens for that campaign.   
  > editor@notrealart.com  
  > elise@artsvilleusa.com  
  >   
- Campaign Slack ID
  
  > Slack ID is the space name in Slack format. The Campaign's Slack ID will be used as an identifier for a space in Slack. It needs to conform to Slack naming requirements, meaning no spaces or special characters, only dashes or underscores.   
  >   
  > Examples:  
  > #not-real-art-general  
  > #artsville-usa-general  
  > #arthouse-general  
  > #not-real-art-exhibition-a  
  > #not-real-art-exhibition-b  
  >   
### Table: Import Log

> The import log table should record incoming paper form submissions and the artist and related campaign the submission was for. Records in the import log will automatically be generated by our n8n automation.   
>   
- Related Artist First Name
  
  > The artist first name related to the import that we receive from paper form via the n8n automation   
  >   
- Related Artist Last Name
  
  > The artist last name related to the import that we receive from paper form via the n8n automation   
  >   
- Related Artist email
  
  > The artist email related to the import that we receive from paper form via the n8n automation   
  >   
- Related Artworks
  
  > Related artwork records that were part of this artist's submission from Paperform and added via n8n   
  >   
- Related Campaign
  
  > The campaign name that was entered via our n8n automation   
  >   
- Import Date
  
  > The date and time stamp for the import.   
  >   
### Table: Export Log

> The export log tracks when pending artwork and artist records are exported into an artwork archive compatible CSV file. The export log will track successfully exported records  
>   
- Artist IDs
  
  > A list of the artist IDs being exported  
  >   
- Related Campaigns
  
  > A list of the campaigns included in the export.   
  >   
- Artist Count
  
  > A count of the artists included in the exploit   
  >   
- Artwork IDs
  
  > A list of the  artwork IDs included in the export.   
  >   
- Artwork Count
  
  > A count of the artworks included in the export.   
  >   
- Filenames Generated
  
  > Each export will create a.CSV file as part of our n8n automation. The n8n automation will create an artist export CSV file in artwork archive compatible format, as well as an artworks CSV file in artwork archive compatible format. The export should probably also be named "Stamped" for the file name, but the file names generated field should include both of those.   
  >   
- File URLs / Storage Links
  
  > The export files created will be stored most likely on Google Drive or in Dropbox, and so the export log should have the file URL and links where these files can be downloaded from.   
  >   
## Paperform Design

### Capture artist basics

### Capture artwork basics

### Campaign Hidden Fields

- Parent Site
  
- Exhibition or Campaign
  
- Start Date
  
- Close Date
  
### Integrations Triggers

- Trigger Active Campaign
  
- Webhook for n8n
  
## n8n Workflow Breakdown

### Paperform Submission Handling

- Trigger Webhook (Paperform)
  
- Split Artists from Artworks
  
- Add/Update Campaign
  
- Add/Update Artists in Airtable
  
- Loop: Add Artworks in Airtable
  
- Update Import Log
  
- Notify Team Members of Completed Import
  
### Enhance & Enrich Data

- Artist Data
  
    - Deep Research Artist
      
    - Generate Extended Profile & History
      
    - Store Extended Social Media Links
      
    - Tags for style, medium, social media
      
    - Update Airtable Artist Data
      
- Artworks Data
  
    - Artwork Tags
      
    - Image Descriptions
      
    - Medium Descriptions
      
    - Update Airtable Artworks Data
      
### Prepare Artwork Archive Export

- Trigger Webhook (Airtable Button)
  
- Gather Pending Artist Data
  
- Convert Pending Artist Data
  
- Create Artist Export .csv
  
- Gather Pending Artworks Data
  
- Convert Pending Artworks Data
  
- Create Artist Export .csv
  
- Store .csv on Dropbox/GDrive
  
- Notify Team Members of Completed Import
  
- Find and Update Artist Record
  
- Update Export Log
  
- Find and Update Artist Record
  
## Open Questions

### .csv file generation in n8n


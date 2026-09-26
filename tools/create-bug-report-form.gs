/**
 * Creates the DigiClicker bug report Google Form (no account needed to
 * answer it) and prints the two values the game needs.
 *
 * How to use:
 *  1. Go to https://script.google.com -> New project.
 *  2. Replace the editor's contents with this file, save.
 *  3. Run `createBugReportForm` (allow access to Google Forms when asked).
 *  4. Open View -> Execution log and copy the printed JSON into
 *     src/lib/data/bugReport.json ("googleForm": { ... }).
 *  5. In the form's Responses tab you can link a Google Sheet to collect
 *     the reports in one place.
 */
function createBugReportForm() {
  const form = FormApp.create('DigiClicker - Bug report');
  form.setDescription(
    'Thanks for playing DigiClicker and taking the time to report this!\n' +
      'The "Game info" answer is filled in by the game - you can leave it as it is.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false); // no sign-in required

  form
    .addParagraphTextItem()
    .setTitle('What happened?')
    .setHelpText('What did you see, and what did you expect instead?')
    .setRequired(true);

  form
    .addParagraphTextItem()
    .setTitle('How can it be reproduced?')
    .setHelpText('The steps that led to it, if you know them (1. Go to ... 2. Click ...).');

  form
    .addMultipleChoiceItem()
    .setTitle('How bad is it?')
    .setChoiceValues([
      'Blocks me - I cannot continue',
      'Annoying, but I can keep playing',
      'Small / cosmetic',
    ]);

  const gameInfo = form
    .addParagraphTextItem()
    .setTitle('Game info')
    .setHelpText('Filled in by the game: build, browser, where you were.');

  form
    .addParagraphTextItem()
    .setTitle('Anything else?')
    .setHelpText('Screenshots: paste an image link (e.g. from Imgur or Discord). Save problems: attach nothing here, but mention it - we may ask for an exported save.');

  form
    .addTextItem()
    .setTitle('Contact (optional)')
    .setHelpText('Discord name or email, if you would like a reply.');

  // The game pre-fills "Game info" through a link parameter "entry.<number>".
  // Build a pre-filled link with a marker answer to find that number.
  const response = form.createResponse();
  response.withItemResponse(gameInfo.createResponse('MARKER'));
  const prefilled = response.toPrefilledUrl();
  const entry = prefilled.match(/(entry\.\d+)=MARKER/)[1];

  const config = { googleForm: { viewUrl: form.getPublishedUrl(), gameInfoEntry: entry } };
  Logger.log('Form editor: ' + form.getEditUrl());
  Logger.log('Paste this into src/lib/data/bugReport.json:\n' + JSON.stringify(config, null, 2));
}

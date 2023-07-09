import { readFileSync, writeFileSync } from 'fs';

// Matches the scrambled number of the /Pages object
const pagesObjRegexGroupIndex = /(?<=\n)(\d{8,10})(?= 0 obj\r\n<< \/Type \/Pages \/Kids )/;
// Matches the true number of the /Pages object, i.e. the parent of the first /Page object it finds
const firstPageIndexRegexGroupPagesIndex = /(?<=<< \/Type \/Page.+\/Parent )(\d+)(?= 0 R)/;

// Matches all the scrambled object numbers and xref byte indices
const objIndexRegex = /(?<=\n)(\d{8,10})(?= 0 obj)|(?<=\n)(\d{10})(?=  00000 n)/g;

const findKey = (scrambled) => {
	const scrambledIndex = parseInt(scrambled.match(pagesObjRegexGroupIndex));
	const trueIndex = parseInt(scrambled.match(firstPageIndexRegexGroupPagesIndex));
	// Note that the key will be zero if the PDF is already unscrambled, meaning this algorithm is
	// idempotent and can also be run on working PDFs without breaking them
	return scrambledIndex ^ trueIndex;
};

const unscramble = (scrambled, key) =>
	scrambled.replace(objIndexRegex, (match) =>
		(parseInt(match) ^ key).toString(10).padStart(match.length, '0'),
	);

const pdfPath = process.argv[2];
const pdfText = readFileSync(pdfPath, 'binary');
writeFileSync(pdfPath, unscramble(pdfText, findKey(pdfText)), 'binary');

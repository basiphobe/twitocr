// https://ocr.space/ocrapi

const ocr = require('ocr-space-api');

var options = {
	apikey: 'e5175f23d488957',
	language: 'eng'
};

const imagePath = 'test.png';

ocr.parseImageFromLocalFile(imagePath, options).then(function(result) {
	console.log('parsedText: \n', result.parsedText);
	console.log('ocrParsedResult: \n', result.ocrParsedResult);
}).catch(function(err) {
	console.log(err);
});

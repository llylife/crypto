module.exports = {
	enc: function (input) {
		var output = Array(input.length >> 2);

		for (var i = 0; i < output.length; i++) {
			output[i] = 0;
		}

		for (var i = 0; i < input.length * 8; i += 8) {
			output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
		}

		return output;
	},

	dec: function(input) {
		var output = "";

		for (var i = 0; i < input.length * 32; i += 8) {
			output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
		}

		return output;
	}
};

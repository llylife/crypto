var assert = require('assert');
var crypto = require('..');

describe('sha1', function () {
	it('truism', function () {
		assert.equal(
			crypto.sha1('abc').hex(),
			'a9993e364706816aba3e25717850c26c9cd0d89d'
		);
	});

	it('php [tests taken from php unit tests]', function () {
		assert.equal(
			crypto.sha1('').hex(),
			'da39a3ee5e6b4b0d3255bfef95601890afd80709'
		);

		assert.equal(
			crypto.sha1('a').hex(),
			'86f7e437faa5a7fce15d1ddcb9eaeaea377667b8'
		);

		assert.equal(
			crypto.sha1('012345678901234567890123456789012345678901234567890123456789').hex(),
			'f52e3c2732de7bea28f216d877d78dae1aa1ac6a'
		);
	});

	it('FIPS-180 Vectors', function () {
		assert.equal(
			crypto.sha1('abc').hex(),
			'a9993e364706816aba3e25717850c26c9cd0d89d'
		);

		assert.equal(
			crypto.sha1('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq').hex(),
			'84983e441c3bd26ebaae4aa1f95129e5e54670f1'
		);

		assert.equal(
			crypto.sha1(Array(1000000+1).join('a')).hex(),
			'34aa973cd4c4daa4f61eeb2bdbad27316534016f'
		);
	});
});

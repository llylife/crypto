/**
 * JavaScript Crypto library by Cyphrd
 * Copyright (C) 2012 Cyphrd.com
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or any later version.
 * 
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 * 
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

/*
 * JavaScript implementation of Password-Based Key Derivation Function 2
 * (PBKDF2) as defined in RFC 2898.
 * Version 1.3 
 * Copyright (c) 2007, 2008, 2009, 2010, 2011, 2012 Parvez Anandam
 * parvez.anandam@cern.ch
 * http://anandam.name/pbkdf2
 *
 * Distributed under the BSD license
 *
 * Uses Paul Johnston's excellent SHA-1 JavaScript library sha1.js:
 * http://pajhome.org.uk/crypt/md5/sha1.html
 * (uses the str2binb() function from that libary)
 *
 * Thanks to Felix Gartsman for pointing out a bug in version 1.0
 * Thanks to Thijs Van der Schaeghe for pointing out a bug in version 1.1 
 * Thanks to Richard Gautier for asking to clarify dependencies in version 1.2
 */


/*
 * The four arguments to the constructor of the PBKDF2 object are 
 * the password, salt, number of iterations and number of bytes in
 * generated key. This follows the RFC 2898 definition: PBKDF2 (P, S, c, dkLen)
 *
 * The method deriveKey takes two parameters, both callback functions:
 * the first is used to provide status on the computation, the second
 * is called with the result of the computation (the generated key in hex).
 *
 * Example of use:
 *
 *    <script src="sha1.js"></script>
 *    <script src="pbkdf2.js"></script>
 *    <script>
 *    var mypbkdf2 = new PBKDF2("mypassword", "saltines", 1000, 16);
 *    var status_callback = function(percent_done) {
 *        document.getElementById("status").innerHTML = "Computed " + percent_done + "%"};
 *    var result_callback = function(key) {
 *        document.getElementById("status").innerHTML = "The derived key is: " + key};
 *    mypbkdf2.deriveKey(status_callback, result_callback);
 *    </script>PBKDF2
 *    <div id="status"></div>
 *
 */

goog.provide('cyphrd.crypto.PBKDF2');

goog.require('cyphrd.crypto.sha1');

var chrsz = 16;  /* bits per input character. 8 - ASCII; 16 - Unicode  */

function str2binb (str) {
  var bin = Array();
  var mask = (1 << chrsz) - 1;
  for(var i = 0; i < str.length * chrsz; i += chrsz)
    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (24 - i%32);
  return bin;
}

function binb2hex (binarray) {
  var hexcase = 0; /* hex output format. 0 - lowercase; 1 - uppercase */
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var str = "";
  for (var i = 0; i < binarray.length * 4; i++) {
    str += hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8+4)) & 0xF) + hex_tab.charAt((binarray[i>>2] >> ((3 - i%4)*8  )) & 0xF);
  }
  return str;
}

/**
 * @constructor
 */
cyphrd.crypto.PBKDF2 = function(password, salt, num_iterations, num_bytes) {
	// Remember the password and salt
	var m_bpassword = str2binb(password);
	var m_salt = salt;

	// Total number of iterations
	var m_total_iterations = num_iterations;

	// Run iterations in chunks instead of all at once, so as to not block.
	// Define size of chunk here; adjust for slower or faster machines if necessary.
	var m_iterations_in_chunk = 10;

	// Iteration counter
	var m_iterations_done = 0;

	// Key length, as number of bytes
	var m_key_length = num_bytes;

	// The hash cache
	var m_hash = null;

	// The length (number of bytes) of the output of the pseudo-random function.
	// Since HMAC-SHA1 is the standard, and what is used here, it's 20 bytes.
	var m_hash_length = 20;

	// Number of hash-sized blocks in the derived key (called 'l' in RFC2898)
	var m_total_blocks = Math.ceil(m_key_length/m_hash_length);

	// Start computation with the first block
	var m_current_block = 1;

	// Used in the HMAC-SHA1 computations
	var m_ipad = new Array(16);
	var m_opad = new Array(16);

	// This is where the result of the iterations gets sotred
	var m_buffer = new Array(0x0,0x0,0x0,0x0,0x0);
	
	// The result
	var m_key = "";

	// This object
	var m_this_object = this;

	// The function to call with the result
	var m_result_func;

	// The function to call with status after computing every chunk
	var m_status_func;

	var m_start_time, m_end_time;
	
	// Set up the HMAC-SHA1 computations
	if (m_bpassword.length > 16)
		m_bpassword = binb_sha1(m_bpassword, password.length * chrsz);

	for(var i = 0; i < 16; ++i)
	{
		m_ipad[i] = m_bpassword[i] ^ 0x36363636;
		m_opad[i] = m_bpassword[i] ^ 0x5C5C5C5C;
	}


	// Starts the computation
	this.deriveKey = function(status_callback, result_callback)
	{
		m_start_time = Date.now();
		m_status_func = status_callback;
		m_result_func = result_callback;
		setTimeout(function() { m_this_object.do_PBKDF2_iterations() }, 0);
	}


	// The workhorse
	this.do_PBKDF2_iterations = function()
	{
		var iterations = m_iterations_in_chunk;
		if (m_total_iterations - m_iterations_done < m_iterations_in_chunk)
			iterations = m_total_iterations - m_iterations_done;
			
		for(var i=0; i<iterations; ++i)
		{
			// compute HMAC-SHA1 
			if (m_iterations_done == 0)
			{
				var salt_block = m_salt +
						String.fromCharCode(m_current_block >> 24 & 0xF) +
						String.fromCharCode(m_current_block >> 16 & 0xF) +
						String.fromCharCode(m_current_block >>  8 & 0xF) +
						String.fromCharCode(m_current_block       & 0xF);

				m_hash = binb_sha1(m_ipad.concat(str2binb(salt_block)),
								   512 + salt_block.length * 8);
				m_hash = binb_sha1(m_opad.concat(m_hash), 512 + 160);
			}
			else
			{
				m_hash = binb_sha1(m_ipad.concat(m_hash), 
								   512 + m_hash.length * 32);
				m_hash = binb_sha1(m_opad.concat(m_hash), 512 + 160);
			}

        	for(var j=0; j<m_hash.length; ++j)
                	m_buffer[j] ^= m_hash[j];

			m_iterations_done++;
		}

		// Call the status callback function
		m_status_func( (m_current_block - 1 + m_iterations_done/m_total_iterations) / m_total_blocks);

		if (m_iterations_done < m_total_iterations)
		{
			setTimeout(function() { m_this_object.do_PBKDF2_iterations() }, 0);
		}
		else
		{
			if (m_current_block < m_total_blocks)
			{
				// Compute the next block (T_i in RFC 2898)
				
				m_key += binb2hex(m_buffer);
			
				m_current_block++;
				m_buffer = new Array(0x0,0x0,0x0,0x0,0x0);
				m_iterations_done = 0;

				setTimeout(function() { m_this_object.do_PBKDF2_iterations() }, 0);
			}
			else
			{
				// We've computed the final block T_l; we're done.
			
				var tmp = binb2hex(m_buffer);
				m_key += tmp.substr(0, (m_key_length - (m_total_blocks - 1) * m_hash_length) * 2 );
				
				// Call the result callback function
				if (goog.isFunction(m_result_func)) {
					m_end_time = Date.now();
					m_result_func(m_key, m_end_time - m_start_time);
				}
			}
		}
	}
};
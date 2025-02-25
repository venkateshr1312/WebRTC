import { useState } from 'react';

// Custom hook to encode and decode a mobile number
const useMobileNumber = () => {
  const [encodedNumber, setEncodedNumber] = useState<string>('');
  const [decodedNumber, setDecodedNumber] = useState<string>('');

  // Encode mobile number to Base64
  const encodeNumber = (mobileNumber: string) => {
    try {
      // Safely encode using encodeURIComponent and then Base64 encode
      const encoded = btoa(encodeURIComponent(mobileNumber)); 
      setEncodedNumber(encoded);
    } catch (error) {
      console.error('Encoding error:', error);
    }
  };

  // Decode the encoded mobile number from Base64
  const decodeNumber = () => {
    try {
      // Decode Base64 and then decodeURIComponent to get the original string
      const decoded = decodeURIComponent(atob(encodedNumber)); 
      setDecodedNumber(decoded);
    } catch (error) {
      console.error('Decoding error:', error);
    }
  };

  return {
    encodedNumber,
    decodedNumber,
    encodeNumber,
    decodeNumber,
  };
};

export default useMobileNumber;

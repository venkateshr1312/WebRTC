import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';


const EncryptionComponent: React.FC = () => {
  const { id } = useParams<{ id: string }>();  // Get the dynamic 'id' from URL
  const [decodedData, setDecodedData] = useState<string>('');
  const [inputData, setInputData] = useState<string>('');
  const [encodedData, setEncodedData] = useState<string>('');

  // Decode the 'id' from the URL (Base64)
  useEffect(() => {
    if (id) {
      try {
        const decoded = atob(id);  // Decode Base64
        setDecodedData(decoded);
      } catch (error) {
        console.error('Error decoding Base64 data:', error);
      }
    }
  }, [id]);

  // Handle encoding of user input data
  const handleEncode = () => {
    try {
      const encoded = btoa(inputData);  // Encode to Base64
      setEncodedData(encoded);
    } catch (error) {
      console.error('Error encoding data:', error);
    }
  };

  return (
    <div>
      <h1>Encrypt and Decrypt using Base64</h1>

      {/* Display the decoded URL parameter */}
      <div>
        <h2>Decoded Data from URL:</h2>
        <p>{decodedData || 'No data to decode yet from URL'}</p>
      </div>

      {/* Input section to encode data */}
      <div>
        <h2>Enter Data to Encode:</h2>
        <input
          type="text"
          placeholder="Enter text to encode"
          value={inputData}
          onChange={(e) => setInputData(e.target.value)}
        />
        <button onClick={handleEncode}>Encode</button>
      </div>

      <div>
        <h2>Encoded Data (Base64):</h2>
        <p>{encodedData || 'No encoded data yet'}</p>
      </div>
    </div>
  );
};

export default EncryptionComponent;

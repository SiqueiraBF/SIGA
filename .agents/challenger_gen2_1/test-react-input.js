import React from 'react';

// Simplified representation of the bug
const BugReproduction = () => {
    // simulated e.target.value from <input type="number">
    const valueFromInput = "1500.50"; 
    
    // Developer's parsing logic:
    const parsed = Number(valueFromInput.toString().replace(/\./g, '').replace(',', '.'));
    
    console.log("Original value string from input type='number':", valueFromInput);
    console.log("Parsed numeric value:", parsed);
    console.log("Is it correct?", parsed === 1500.50);
}

BugReproduction();

// selectIp.js

import React from 'react';


const SelectIp = ({listOfIps, selectedIp, onSelect, disabled}) => {
    const onChange = (event) => {
        onSelect(event.target.value);
    };

    return (
        <select style={{marginLeft: 10}} onChange={onChange} value={selectedIp} disabled={disabled}>
            <option value="0.0.0.0">Select Local IP Address...</option>
            {listOfIps.map(ip => (
                <option key={ip.value} value={ip.value}>{ip.label}</option>
            ))}
        </select>
    )
};

export default SelectIp;
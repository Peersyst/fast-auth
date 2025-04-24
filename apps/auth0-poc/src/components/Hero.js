import React from "react";

import logo from "../assets/logo.svg";

const Hero = () => (
    <div className="text-center hero my-5">
        <img className="mb-3 app-logo" src={logo} alt="React logo" width="120" />
        <h1 className="mb-4">FastAuth Wallet</h1>

        <p className="lead">
            This is a sample application that demonstrates how to interact with the FastAuth contract to sign transactions through the MPC.
        </p>
    </div>
);

export default Hero;

import React from "react";
import { App, View } from "framework7-react";
import "./App.css";
import ListPage from "./ListPage/ListPage.js";

const f7params = {
    root: "#app", // App root element
    id: "io.framework7.testapp", // App bundle ID
    name: "Framework7", // App name
    theme: "auto", // Automatic theme detection
    // App routes
    routes: [
        {
            path: "/list/",
            component: ListPage,
        },
    ],
};

function Main() {
    return (
        <App params={f7params}>
            <View main url="/" />
        </App>
    );
}

export default Main;

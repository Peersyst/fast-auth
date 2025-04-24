import React, { useState } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
    Collapse,
    Container,
    Navbar,
    NavbarToggler,
    NavbarBrand,
    Nav,
    NavItem,
    NavLink,
    Button,
    UncontrolledDropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
} from "reactstrap";

import { useAuth0 } from "@auth0/auth0-react";

const NavBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const { user, isAuthenticated, loginWithRedirect, logout } = useAuth0();
    const toggle = () => setIsOpen(!isOpen);

    const logoutWithRedirect = () =>
        logout({
            logoutParams: {
                returnTo: window.location.origin,
            },
        });

    return (
        <div className="nav-container">
            <Navbar color="light" light expand="md" container={false}>
                <Container>
                    <NavbarBrand className="logo" />
                    <NavbarToggler onClick={toggle} />
                    <Collapse isOpen={isOpen} navbar>
                        <Nav className="mr-auto" navbar>
                            <NavItem>
                                <NavLink tag={RouterNavLink} to="/" exact activeClassName="router-link-exact-active">
                                    Home
                                </NavLink>
                            </NavItem>
                            {isAuthenticated && (
                                <NavItem>
                                    <NavLink tag={RouterNavLink} to="/external-api" exact activeClassName="router-link-exact-active">
                                        External API
                                    </NavLink>
                                </NavItem>
                            )}
                        </Nav>
                        <Nav className="d-none d-md-block" navbar>
                            {!isAuthenticated && (
                                <NavItem>
                                    <Button
                                        id="qsLoginBtn"
                                        color="primary"
                                        className="btn-margin"
                                        onClick={() =>
                                            loginWithRedirect({
                                                authorizationParams: {
                                                    imageUrl:
                                                        "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
                                                    name: "Peersyst Technology",
                                                    permissions: JSON.stringify({
                                                        sendTransaction: true,
                                                        readTransaction: true,
                                                        sendTest: true,
                                                        readTest: true,
                                                        sendTest2: true,
                                                        readTest2: true,
                                                        sendTest3: true,
                                                        readTest3: true,
                                                        sendTest4: true,
                                                        readTest4: true,
                                                        sendTest5: true,
                                                        readTest5: true,
                                                        sendTest6: true,
                                                        readTest6: true,
                                                        sendTest7: true,
                                                        readTest7: true,
                                                        sendTest8: true,
                                                        readTest8: true,
                                                        sendTest9: true,
                                                        readTest9: true,
                                                        sendTest10: true,
                                                        readTest10: true,
                                                        sendTest11: true,
                                                        readTest11: true,
                                                        preSendTransaction: true,
                                                        preReadTransaction: true,
                                                        preSendTest: true,
                                                        preReadTest: true,
                                                        preSendTest2: true,
                                                        preReadTest2: true,
                                                        preSendTest3: true,
                                                        preReadTest3: true,
                                                        preSendTest4: true,
                                                        preReadTest4: true,
                                                        preSendTest5: true,
                                                        preReadTest5: true,
                                                        preSendTest6: true,
                                                        preReadTest6: true,
                                                        preSendTest7: true,
                                                        preReadTest7: true,
                                                        preSendTest8: true,
                                                        preReadTest8: true,
                                                        preSendTest9: true,
                                                        preReadTest9: true,
                                                        preSendTest10: true,
                                                        preReadTest10: true,
                                                        preSendTest11: true,
                                                        preReadTest11: true,
                                                    }),
                                                },
                                            })
                                        }
                                    >
                                        Log in
                                    </Button>
                                </NavItem>
                            )}
                            {isAuthenticated && (
                                <UncontrolledDropdown nav inNavbar>
                                    <DropdownToggle nav caret id="profileDropDown">
                                        <img src={user.picture} alt="Profile" className="nav-user-profile rounded-circle" width="50" />
                                    </DropdownToggle>
                                    <DropdownMenu>
                                        <DropdownItem header>{user.name}</DropdownItem>
                                        <DropdownItem
                                            tag={RouterNavLink}
                                            to="/profile"
                                            className="dropdown-profile"
                                            activeClassName="router-link-exact-active"
                                        >
                                            <FontAwesomeIcon icon="user" className="mr-3" /> Profile
                                        </DropdownItem>
                                        <DropdownItem id="qsLogoutBtn" onClick={() => logoutWithRedirect()}>
                                            <FontAwesomeIcon icon="power-off" className="mr-3" /> Log out
                                        </DropdownItem>
                                    </DropdownMenu>
                                </UncontrolledDropdown>
                            )}
                        </Nav>
                        {!isAuthenticated && (
                            <Nav className="d-md-none" navbar>
                                <NavItem>
                                    <Button id="qsLoginBtn" color="primary" block onClick={() => loginWithRedirect({})}>
                                        Log in
                                    </Button>
                                </NavItem>
                            </Nav>
                        )}
                        {isAuthenticated && (
                            <Nav className="d-md-none justify-content-between" navbar style={{ minHeight: 170 }}>
                                <NavItem>
                                    <span className="user-info">
                                        <img
                                            src={user.picture}
                                            alt="Profile"
                                            className="nav-user-profile d-inline-block rounded-circle mr-3"
                                            width="50"
                                        />
                                        <h6 className="d-inline-block">{user.name}</h6>
                                    </span>
                                </NavItem>
                                <NavItem>
                                    <FontAwesomeIcon icon="user" className="mr-3" />
                                    <RouterNavLink to="/profile" activeClassName="router-link-exact-active">
                                        Profile
                                    </RouterNavLink>
                                </NavItem>
                                <NavItem>
                                    <FontAwesomeIcon icon="power-off" className="mr-3" />
                                    <RouterNavLink to="#" id="qsLogoutBtn" onClick={() => logoutWithRedirect()}>
                                        Log out
                                    </RouterNavLink>
                                </NavItem>
                            </Nav>
                        )}
                    </Collapse>
                </Container>
            </Navbar>
        </div>
    );
};

export default NavBar;

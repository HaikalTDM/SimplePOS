import { useState } from "react";
import { NavLink } from "react-router-dom";
import Modal from "./Modal";
import {
  IconExpenses,
  IconHome,
  IconMore,
  IconProducts,
  IconSales,
  IconSell,
  IconSettings,
} from "./icons";

const HEADER_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/pos", label: "Sell" },
  { to: "/products", label: "Products" },
  { to: "/sales", label: "Sales" },
  { to: "/expenses", label: "Expenses" },
  { to: "/settings", label: "Settings" },
];

const MOBILE_MORE_LINKS = [
  { to: "/products", label: "Products", icon: IconProducts },
  { to: "/expenses", label: "Expenses", icon: IconExpenses },
  { to: "/settings", label: "Settings", icon: IconSettings },
];

export interface NavProps {
  stallName?: string;
}

export function HeaderNav({ stallName }: NavProps) {
  return (
    <header className="header-nav">
      <div className="header-nav__inner">
        <NavLink to="/dashboard" className="header-nav__brand">
          {stallName ? `${stallName} POS by Captura` : "SimplePOS"}
        </NavLink>
        <nav className="header-nav__links" aria-label="Main navigation">
          {HEADER_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? "header-nav__link header-nav__link--active" : "header-nav__link"
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function MobileNav({ stallName }: NavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  const mainLinks = [
    { to: "/dashboard", label: "Home", icon: IconHome },
    { to: "/pos", label: "Sell", icon: IconSell },
    { to: "/sales", label: "Sales", icon: IconSales },
  ];

  return (
    <>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mainLinks.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "mobile-nav__link mobile-nav__link--active" : "mobile-nav__link"
            }
          >
            <item.icon size={22} />
            <span>{item.label}</span>
          </NavLink>
        ))}
        <button
          type="button"
          className="mobile-nav__link mobile-nav__more"
          onClick={() => setMoreOpen(true)}
        >
          <IconMore size={22} />
          <span>More</span>
        </button>
      </nav>
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        {stallName && <p className="mobile-nav__more-brand">{stallName} POS by Captura</p>}
        <div className="mobile-nav__more-list">
          {MOBILE_MORE_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="mobile-nav__more-link"
              onClick={() => setMoreOpen(false)}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </div>
      </Modal>
    </>
  );
}

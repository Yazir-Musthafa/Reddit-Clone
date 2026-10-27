import React from 'react';
import { Link } from 'react-router';

export default function Footer() {
    return (
        <footer className="footer-links-container" id="footer-container">
            <div className="footer-row">
                <Link to="/index.html?view=home" className="footer-link" data-nav="home">Home</Link>
                <Link to="/index.html?view=popular" className="footer-link" data-nav="popular">Popular</Link>
                <Link to="/index.html?view=news" className="footer-link" data-nav="news">News</Link>
                <Link to="/index.html?view=explore" className="footer-link" data-nav="explore">Explore</Link>
                <Link to="/index.html?view=popular&sort=top&t=all" className="footer-link">Best of Reddit</Link>
            </div>
            <div className="footer-row">
                <Link to="/page.html?p=best-of-reddit&lang=pt" className="footer-link">Best of Reddit in Portuguese</Link>
            </div>
            <div className="footer-row">
                <Link to="/page.html?p=best-of-reddit&lang=de" className="footer-link">Best of Reddit in German</Link>
                <Link to="/page.html?p=rules" className="footer-link">Reddit Rules</Link>
            </div>
            <div className="footer-row">
                <Link to="/page.html?p=privacy" className="footer-link">Privacy Policy</Link>
                <Link to="/page.html?p=user-agreement" className="footer-link">User Agreement</Link>
                <Link to="/page.html?p=accessibility" className="footer-link">Accessibility</Link>
            </div>
            <div className="footer-copyright">
                Reddit, Inc. © 2026. All rights reserved.
            </div>
        </footer>
    );
}

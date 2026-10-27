import React, { useEffect } from 'react';
import { Link } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';

export default function NotFoundPage() {
    useEffect(() => {
        document.title = 'Page not found - Reddit';
    }, []);

    return (
        <AppLayout rightColumn={false}>
            <div className="rc-empty-state">
                <h3>Page not found</h3>
                <p>The page you're looking for doesn't exist or has moved.</p>
                <Link className="ui-btn ui-btn-primary" to="/index.html">
                    Go home
                </Link>
            </div>
        </AppLayout>
    );
}

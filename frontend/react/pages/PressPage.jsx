import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { showToast } from '../Toasts.jsx';
import { formatDate, formatNumber, copyToClipboard, absoluteUrl } from '../../js/utils.js';

const BRAND_COLORS = [
    { name: 'OrangeRed', hex: '#FF4500' },
    { name: 'Periwinkle', hex: '#7193FF' },
    { name: 'Dark', hex: '#1A1A1B' },
    { name: 'Light Grey', hex: '#F6F7F8' }
];

const ASSETS = [
    { file: 'assets/brand/logo-light.svg', label: 'Logo (light background)' },
    { file: 'assets/brand/logo-dark.svg', label: 'Logo (dark background)' },
    { file: 'assets/brand/icon.svg', label: 'Snoo icon' }
];

export default function PressPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const { user } = useAuth();
    const releaseSlug = searchParams.get('release');

    return (
        <AppLayout rightColumn={false}>
            {releaseSlug ? (
                <PressReleaseDetail
                    slug={releaseSlug}
                    onBack={() => {
                        const next = new URLSearchParams(searchParams);
                        next.delete('release');
                        setSearchParams(next);
                    }}
                />
            ) : (
                <PressHomeView
                    user={user}
                    onSelectRelease={(slug) => {
                        const next = new URLSearchParams(searchParams);
                        next.set('release', slug);
                        setSearchParams(next);
                    }}
                />
            )}
        </AppLayout>
    );
}

function PressHomeView({ user, onSelectRelease }) {
    // Stats
    const [stats, setStats] = useState(null);
    const [statsLoading, setStatsLoading] = useState(true);

    // Releases
    const [releases, setReleases] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [releasesLoading, setReleasesLoading] = useState(true);

    // Media inquiry form
    const [inqName, setInqName] = useState(user?.displayName || '');
    const [inqEmail, setInqEmail] = useState(user?.email || '');
    const [inqOutlet, setInqOutlet] = useState('');
    const [inqDeadline, setInqDeadline] = useState('');
    const [inqTopic, setInqTopic] = useState('');
    const [inqMessage, setInqMessage] = useState('');
    const [inqError, setInqError] = useState('');
    const [inqSubmitting, setInqSubmitting] = useState(false);
    const [inqReference, setInqReference] = useState(null);

    useEffect(() => {
        document.title = 'Press - Reddit';
        api.get('/press/stats')
            .then(data => setStats(data))
            .catch(() => setStats(null))
            .finally(() => setStatsLoading(false));
    }, []);

    const loadReleases = (cat, pageNum, append = false) => {
        setReleasesLoading(true);
        const url = `/press/releases?page=${pageNum}${cat ? `&category=${encodeURIComponent(cat)}` : ''}`;
        api.get(url)
            .then(data => {
                const fetched = data.releases || [];
                setReleases(prev => append ? [...prev, ...fetched] : fetched);
                if (data.categories && categories.length === 0) setCategories(data.categories);
                setHasMore(!!data.hasMore);
                setPage(pageNum + 1);
            })
            .catch(() => {})
            .finally(() => setReleasesLoading(false));
    };

    useEffect(() => {
        loadReleases(selectedCategory, 0, false);
    }, [selectedCategory]);

    const handleCopyColor = async (hex) => {
        const ok = await copyToClipboard(hex);
        showToast(ok ? `Copied ${hex}` : "Couldn't copy the colour");
    };

    const handleInquirySubmit = async (e) => {
        e.preventDefault();
        setInqError('');

        const missing = [
            [!inqName.trim(), 'your name'],
            [!inqEmail.trim(), 'your email'],
            [!inqOutlet.trim(), 'your publication'],
            [!inqTopic.trim(), 'a topic'],
            [!inqMessage.trim(), 'a message']
        ].find(([isMissing]) => isMissing);

        if (missing) {
            setInqError(`Please enter ${missing[1]}`);
            return;
        }

        setInqSubmitting(true);
        try {
            const { reference } = await api.post('/press/inquiries', {
                name: inqName.trim(),
                email: inqEmail.trim(),
                outlet: inqOutlet.trim(),
                deadline: inqDeadline,
                topic: inqTopic.trim(),
                message: inqMessage.trim()
            });
            setInqReference(reference);
            showToast('Inquiry sent');
        } catch (err) {
            setInqError(err.message);
        } finally {
            setInqSubmitting(false);
        }
    };

    return (
        <div className="rc-company-page">
            <section className="rc-company-hero rc-hero-press no-invert">
                <h1>Press</h1>
                <p>News, facts and brand assets for journalists writing about Reddit.</p>
                <a className="ui-btn rc-hero-btn" href="#mediaInquiry">Contact the press team</a>
            </section>

            <section>
                <h2 className="rc-section-heading">Reddit by the numbers</h2>
                <div className="rc-stat-grid" id="pressStats">
                    {statsLoading ? (
                        <div className="rc-spinner" />
                    ) : stats ? (
                        <>
                            <div className="rc-stat"><strong>{formatNumber(stats.users)}</strong><span>Redditors</span></div>
                            <div className="rc-stat"><strong>{formatNumber(stats.communities)}</strong><span>Communities</span></div>
                            <div className="rc-stat"><strong>{formatNumber(stats.posts)}</strong><span>Posts</span></div>
                            <div className="rc-stat"><strong>{formatNumber(stats.comments)}</strong><span>Comments</span></div>
                        </>
                    ) : (
                        <p className="rc-muted-text">Stats unavailable</p>
                    )}
                </div>
                <p className="rc-muted-text">Live figures from this site's database.</p>
            </section>

            <section>
                <h2 className="rc-section-heading">Latest news</h2>
                <div className="rc-chip-row" id="releaseCategories">
                    {['', ...categories].map(c => (
                        <button
                            key={c}
                            type="button"
                            className={`explore-tab-pill ${c === selectedCategory ? 'active' : ''}`}
                            data-category={c}
                            onClick={() => setSelectedCategory(c)}
                        >
                            {c || 'All'}
                        </button>
                    ))}
                </div>

                <div id="releaseList">
                    {releases.length > 0 ? (
                        releases.map(r => (
                            <a
                                key={r.slug}
                                className="rc-release-row"
                                href={`press.html?release=${encodeURIComponent(r.slug)}`}
                                data-slug={r.slug}
                                onClick={(e) => {
                                    e.preventDefault();
                                    onSelectRelease(r.slug);
                                }}
                            >
                                <span className="rc-release-meta">
                                    <span className="rc-badge">{r.category}</span> {formatDate(r.publishedAt)}
                                </span>
                                <strong>{r.title}</strong>
                                <p>{r.summary}</p>
                            </a>
                        ))
                    ) : releasesLoading ? (
                        <div className="rc-spinner" />
                    ) : (
                        <p className="rc-muted-text">No press releases yet.</p>
                    )}
                </div>

                <div className="rc-feed-status" id="releaseMore">
                    {hasMore && (
                        <button
                            type="button"
                            className="ui-btn ui-btn-secondary"
                            onClick={() => loadReleases(selectedCategory, page, true)}
                        >
                            Load more
                        </button>
                    )}
                </div>
            </section>

            <section>
                <h2 className="rc-section-heading">Brand assets</h2>
                <div className="rc-asset-grid">
                    {ASSETS.map(a => (
                        <div key={a.file} className="rc-asset-card">
                            <div className="rc-asset-preview no-invert">
                                <img src={a.file} alt={a.label} />
                            </div>
                            <strong>{a.label}</strong>
                            <a className="ui-btn ui-btn-secondary" href={a.file} download>Download SVG</a>
                        </div>
                    ))}
                </div>
                <div className="rc-color-row">
                    {BRAND_COLORS.map(c => (
                        <button
                            key={c.hex}
                            type="button"
                            className="rc-color-chip"
                            data-hex={c.hex}
                            title={`Copy ${c.hex}`}
                            onClick={() => handleCopyColor(c.hex)}
                        >
                            <span className="no-invert" style={{ background: c.hex }} />
                            {c.name}<small>{c.hex}</small>
                        </button>
                    ))}
                </div>
            </section>

            <section id="mediaInquiry" className="rc-settings-section">
                <h2>Media inquiries</h2>
                <p className="rc-muted-text">
                    Working on a story? Send us the details and we'll get back to you, usually within one business day.
                </p>

                {inqReference ? (
                    <div className="rc-success-box">
                        <span className="rc-success-icon">📨</span>
                        <div>
                            <strong>Thanks, your inquiry was sent.</strong>
                            <p>
                                Your reference number is <strong>{inqReference}</strong>. We'll reply to {inqEmail}.
                            </p>
                        </div>
                    </div>
                ) : (
                    <form id="inquiryForm" className="ui-form" noValidate onSubmit={handleInquirySubmit}>
                        <div className="rc-form-grid">
                            <div>
                                <label className="ui-field-label" htmlFor="inqName">Your name *</label>
                                <input
                                    className="ui-input"
                                    id="inqName"
                                    name="name"
                                    maxLength={100}
                                    required
                                    value={inqName}
                                    onChange={e => setInqName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="ui-field-label" htmlFor="inqEmail">Email *</label>
                                <input
                                    className="ui-input"
                                    id="inqEmail"
                                    name="email"
                                    type="email"
                                    required
                                    value={inqEmail}
                                    onChange={e => setInqEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="ui-field-label" htmlFor="inqOutlet">Publication / outlet *</label>
                                <input
                                    className="ui-input"
                                    id="inqOutlet"
                                    name="outlet"
                                    maxLength={150}
                                    required
                                    value={inqOutlet}
                                    onChange={e => setInqOutlet(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="ui-field-label" htmlFor="inqDeadline">Deadline</label>
                                <input
                                    className="ui-input"
                                    id="inqDeadline"
                                    name="deadline"
                                    type="date"
                                    value={inqDeadline}
                                    onChange={e => setInqDeadline(e.target.value)}
                                />
                            </div>
                        </div>

                        <label className="ui-field-label" htmlFor="inqTopic">Topic *</label>
                        <input
                            className="ui-input"
                            id="inqTopic"
                            name="topic"
                            maxLength={150}
                            required
                            value={inqTopic}
                            onChange={e => setInqTopic(e.target.value)}
                        />

                        <label className="ui-field-label" htmlFor="inqMessage">Message *</label>
                        <textarea
                            className="ui-input ui-textarea"
                            id="inqMessage"
                            name="message"
                            rows={5}
                            maxLength={5000}
                            required
                            value={inqMessage}
                            onChange={e => setInqMessage(e.target.value)}
                        />

                        <p className={`ui-error ${inqError ? '' : 'hidden'}`} id="inqError">
                            {inqError}
                        </p>

                        <div className="ui-dialog-actions" style={{ justifyContent: 'flex-start' }}>
                            <button
                                type="submit"
                                className="ui-btn ui-btn-primary"
                                disabled={inqSubmitting}
                            >
                                {inqSubmitting ? 'Sending…' : 'Send inquiry'}
                            </button>
                        </div>
                    </form>
                )}
            </section>
        </div>
    );
}

function PressReleaseDetail({ slug, onBack }) {
    const [release, setRelease] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        api.get(`/press/releases/${encodeURIComponent(slug)}`)
            .then(data => {
                if (cancelled) return;
                setRelease(data.release);
                document.title = `${data.release.title} - Press - Reddit`;
            })
            .catch(err => {
                if (cancelled) return;
                setError(err.message || 'Press release not found');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [slug]);

    const handleCopy = async () => {
        const ok = await copyToClipboard(absoluteUrl(`press.html?release=${release.slug}`));
        showToast(ok ? 'Link copied!' : "Couldn't copy the link");
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <div className="rc-spinner" />
            </div>
        );
    }

    if (error || !release) {
        return (
            <div className="rc-empty-state">
                <h3>{error || 'Release not found'}</h3>
                <button type="button" className="ui-btn ui-btn-primary" onClick={onBack}>
                    Back to Press
                </button>
            </div>
        );
    }

    return (
        <div className="rc-company-page">
            <button
                type="button"
                className="rc-back-link"
                id="backToPress"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                onClick={onBack}
            >
                ← All press releases
            </button>

            <article className="rc-info-page">
                <p className="rc-release-meta">
                    <span className="rc-badge">{release.category}</span> {formatDate(release.publishedAt)}
                </p>
                <h1>{release.title}</h1>
                <p className="rc-release-lede">{release.summary}</p>

                <div dangerouslySetInnerHTML={{ __html: release.body || '' }} />

                <div className="ui-dialog-actions" style={{ justifyContent: 'flex-start', marginTop: '24px' }}>
                    <button type="button" className="ui-btn ui-btn-secondary" id="copyReleaseLink" onClick={handleCopy}>
                        Copy link
                    </button>
                    <a className="ui-btn ui-btn-primary" href="press.html#mediaInquiry">
                        Contact the press team
                    </a>
                </div>
            </article>
        </div>
    );
}

import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import AppLayout from '../layout/AppLayout.jsx';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { showToast } from '../Toasts.jsx';
import { formatDate, timeAgo, copyToClipboard, absoluteUrl } from '../../js/utils.js';

const VALUES = [
    { icon: '🧡', title: 'Community first', text: 'We build for the people who make Reddit what it is.' },
    { icon: '🔭', title: 'Stay curious', text: 'Ask questions, share what you learn, and follow the interesting thread.' },
    { icon: '🤝', title: 'Own it together', text: 'Small teams with big scope, and a culture of helping each other ship.' }
];

const BENEFITS = [
    'Remote-friendly roles',
    'Health, dental and vision cover',
    'Learning & conference budget',
    'Generous parental leave',
    'Home office stipend',
    'Flexible time off'
];

export default function CareersPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, isLoggedIn, confirmDialog } = useAuth();

    const jobSlug = searchParams.get('job');

    return (
        <AppLayout rightColumn={false}>
            {jobSlug ? (
                <JobDetailView
                    slug={jobSlug}
                    user={user}
                    onBack={() => {
                        const next = new URLSearchParams(searchParams);
                        next.delete('job');
                        setSearchParams(next);
                    }}
                />
            ) : (
                <JobsListView
                    user={user}
                    isLoggedIn={isLoggedIn}
                    confirmDialog={confirmDialog}
                    onSelectJob={(slug) => {
                        const next = new URLSearchParams(searchParams);
                        next.set('job', slug);
                        setSearchParams(next);
                    }}
                />
            )}
        </AppLayout>
    );
}

function JobsListView({ user, isLoggedIn, confirmDialog, onSelectJob }) {
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('');
    const [location, setLocation] = useState('');
    const [remote, setRemote] = useState(false);

    const [departments, setDepartments] = useState([]);
    const [locations, setLocations] = useState([]);
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // My applications
    const [myApplications, setMyApplications] = useState([]);

    const loadApplications = () => {
        if (!isLoggedIn) return;
        api.get('/careers/applications')
            .then(data => setMyApplications(data.applications || []))
            .catch(() => setMyApplications([]));
    };

    useEffect(() => {
        loadApplications();
    }, [isLoggedIn]);

    const handleWithdraw = async (appId) => {
        const confirmed = await confirmDialog('Withdraw this application? Your resume will be deleted.', {
            title: 'Withdraw application?',
            confirmLabel: 'Withdraw',
            danger: true
        });
        if (!confirmed) return;

        try {
            await api.del(`/careers/applications/${appId}`);
            showToast('Application withdrawn');
            loadApplications();
        } catch (err) {
            showToast(err.message);
        }
    };

    useEffect(() => {
        let cancelled = false;
        setLoading(true);

        const params = new URLSearchParams();
        if (search.trim()) params.set('q', search.trim());
        if (department) params.set('department', department);
        if (location) params.set('location', location);
        if (remote) params.set('remote', 'true');

        const timer = setTimeout(() => {
            api.get(`/careers/jobs?${params}`)
                .then(data => {
                    if (cancelled) return;
                    setJobs(data.jobs || []);
                    if (data.departments && departments.length === 0) setDepartments(data.departments);
                    if (data.locations && locations.length === 0) setLocations(data.locations);
                })
                .catch(err => {
                    if (cancelled) return;
                    setError(err.message);
                })
                .finally(() => {
                    if (!cancelled) setLoading(false);
                });
        }, 200);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [search, department, location, remote]);

    // Group jobs by department
    const byDept = jobs.reduce((acc, j) => {
        (acc[j.department] ||= []).push(j);
        return acc;
    }, {});

    return (
        <div className="rc-company-page">
            <section className="rc-company-hero rc-hero-careers no-invert">
                <h1>Build the front page of the internet</h1>
                <p>Join the team behind the communities, conversations and moments that bring people together.</p>
                <a className="ui-btn rc-hero-btn" href="#openRoles">View open roles</a>
            </section>

            <section className="rc-value-grid">
                {VALUES.map(v => (
                    <div key={v.title} className="rc-value-card">
                        <span className="rc-value-icon">{v.icon}</span>
                        <strong>{v.title}</strong>
                        <p>{v.text}</p>
                    </div>
                ))}
            </section>

            {isLoggedIn && myApplications.length > 0 && (
                <section id="myApplications">
                    <h2 className="rc-section-heading">My applications</h2>
                    <div className="rc-application-list">
                        {myApplications.map(a => (
                            <div key={a.id} className="rc-application-row">
                                <div>
                                    <button
                                        type="button"
                                        className="rc-job-title"
                                        style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer' }}
                                        onClick={() => onSelectJob(a.job.slug)}
                                    >
                                        {a.job.title}
                                    </button>
                                    <span className="rc-job-meta">
                                        {a.job.department} • {a.job.location} • applied {timeAgo(a.appliedAt)} • {a.resumeName}
                                    </span>
                                </div>
                                <span className="rc-badge rc-status">{a.status}</span>
                                <button
                                    type="button"
                                    className="ui-btn ui-btn-secondary"
                                    data-withdraw={a.id}
                                    onClick={() => handleWithdraw(a.id)}
                                >
                                    Withdraw
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            <section id="openRoles">
                <h2 className="rc-section-heading">Open roles</h2>
                <div className="rc-job-filters">
                    <input
                        className="ui-input"
                        id="jobSearch"
                        type="search"
                        placeholder="Search roles"
                        value={search}
                        aria-label="Search roles"
                        onChange={e => setSearch(e.target.value)}
                    />
                    <select
                        className="ui-input"
                        id="jobDepartment"
                        aria-label="Department"
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                    >
                        <option value="">All departments</option>
                        {departments.map(d => (
                            <option key={d} value={d}>{d}</option>
                        ))}
                    </select>
                    <select
                        className="ui-input"
                        id="jobLocation"
                        aria-label="Location"
                        value={location}
                        onChange={e => setLocation(e.target.value)}
                    >
                        <option value="">All locations</option>
                        {locations.map(l => (
                            <option key={l} value={l}>{l}</option>
                        ))}
                    </select>
                    <label className="ui-checkbox-row rc-remote-toggle">
                        <input
                            type="checkbox"
                            id="jobRemote"
                            checked={remote}
                            onChange={e => setRemote(e.target.checked)}
                        />{' '}
                        Remote only
                    </label>
                </div>

                <p className="rc-muted-text" id="jobCount">
                    {jobs.length} open role{jobs.length === 1 ? '' : 's'}
                </p>

                <div id="jobList">
                    {loading ? (
                        <div className="rc-spinner" />
                    ) : error ? (
                        <p className="rc-muted-text">{error}</p>
                    ) : jobs.length === 0 ? (
                        <div className="rc-empty-state rc-empty-small">
                            <h3>No roles match those filters</h3>
                            <p>Try a different search or clear the filters.</p>
                        </div>
                    ) : (
                        Object.entries(byDept).map(([dept, items]) => (
                            <div key={dept} className="rc-job-group">
                                <h3>{dept}</h3>
                                {items.map(j => (
                                    <a
                                        key={j.slug}
                                        className="rc-job-row"
                                        href={`careers.html?job=${encodeURIComponent(j.slug)}`}
                                        data-slug={j.slug}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            onSelectJob(j.slug);
                                        }}
                                    >
                                        <span className="rc-job-title">{j.title}</span>
                                        <span className="rc-job-meta">
                                            📍 {j.location} • {j.type}
                                            {j.remote && <> • <span className="rc-badge">Remote</span></>}
                                        </span>
                                    </a>
                                ))}
                            </div>
                        ))
                    )}
                </div>
            </section>

            <section className="rc-benefits">
                <h2 className="rc-section-heading">Benefits</h2>
                <ul>
                    {BENEFITS.map(b => (
                        <li key={b}>✓ {b}</li>
                    ))}
                </ul>
            </section>
        </div>
    );
}

function JobDetailView({ slug, user, onBack }) {
    const [job, setJob] = useState(null);
    const [appliedAt, setAppliedAt] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Application form states
    const [name, setName] = useState(user?.displayName || '');
    const [email, setEmail] = useState(user?.email || '');
    const [phone, setPhone] = useState('');
    const [linkedin, setLinkedin] = useState('');
    const [coverLetter, setCoverLetter] = useState('');
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [justApplied, setJustApplied] = useState(false);

    const resumeInputRef = useRef(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        api.get(`/careers/jobs/${encodeURIComponent(slug)}`)
            .then(data => {
                if (cancelled) return;
                setJob(data.job);
                setAppliedAt(data.appliedAt || null);
                document.title = `${data.job.title} - Careers - Reddit`;
            })
            .catch(err => {
                if (cancelled) return;
                setError(err.message || 'Job not found');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => { cancelled = true; };
    }, [slug]);

    const handleShare = async () => {
        const ok = await copyToClipboard(absoluteUrl(`careers.html?job=${job.slug}`));
        showToast(ok ? 'Job link copied!' : "Couldn't copy the link");
    };

    const handleApplySubmit = async (e) => {
        e.preventDefault();
        setFormError('');

        const resumeFile = resumeInputRef.current?.files?.[0];
        if (!name.trim()) {
            setFormError('Please enter your name');
            return;
        }
        if (!email.includes('@')) {
            setFormError('Please enter a valid email address');
            return;
        }
        if (!resumeFile) {
            setFormError('Please attach your resume');
            return;
        }
        if (resumeFile.size > 5 * 1024 * 1024) {
            setFormError('Your resume must be 5 MB or smaller');
            return;
        }

        setSubmitting(true);
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('email', email.trim());
        formData.append('phone', phone.trim());
        formData.append('linkedin', linkedin.trim());
        formData.append('coverLetter', coverLetter.trim());
        formData.append('resume', resumeFile);

        try {
            const result = await api.post(`/careers/jobs/${encodeURIComponent(job.slug)}/apply`, formData);
            setAppliedAt(result.appliedAt || new Date().toISOString());
            setJustApplied(true);
            showToast('Application submitted!');
        } catch (err) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
                <div className="rc-spinner" />
            </div>
        );
    }

    if (error || !job) {
        return (
            <div className="rc-empty-state">
                <h3>{error || 'Role not found'}</h3>
                <button type="button" className="ui-btn ui-btn-primary" onClick={onBack}>
                    See all open roles
                </button>
            </div>
        );
    }

    return (
        <div className="rc-company-page">
            <button
                type="button"
                className="rc-back-link"
                id="backToJobs"
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', font: 'inherit' }}
                onClick={onBack}
            >
                ← All open roles
            </button>

            <header className="rc-job-header">
                <span className="rc-muted-text">{job.department}</span>
                <h1>{job.title}</h1>
                <p className="rc-job-meta">
                    📍 {job.location} • {job.type}
                    {job.remote && <> • <span className="rc-badge">Remote</span></>}
                    {' '}• Posted {formatDate(job.postedAt)}
                </p>
                <div className="ui-dialog-actions" style={{ justifyContent: 'flex-start' }}>
                    <a className="ui-btn ui-btn-primary" href="#applySection">Apply now</a>
                    <button type="button" className="ui-btn ui-btn-secondary" id="shareJobBtn" onClick={handleShare}>
                        Share
                    </button>
                </div>
            </header>

            <div className="rc-info-page rc-job-body">
                <p>{job.summary}</p>
                <h2>What you'll do</h2>
                <ul>
                    {(job.responsibilities || []).map((r, i) => (
                        <li key={i}>{r}</li>
                    ))}
                </ul>
                <h2>What we're looking for</h2>
                <ul>
                    {(job.requirements || []).map((r, i) => (
                        <li key={i}>{r}</li>
                    ))}
                </ul>
            </div>

            <section id="applySection" className="rc-settings-section">
                {appliedAt ? (
                    <div className="rc-success-box">
                        <span className="rc-success-icon">✅</span>
                        <div>
                            <strong>{justApplied ? 'Thanks, your application is in!' : 'You applied for this role'}</strong>
                            <p>
                                Submitted {formatDate(appliedAt)}. {user ? 'Track it under “My applications” on the Careers page.' : "We'll be in touch by email."}
                            </p>
                        </div>
                    </div>
                ) : (
                    <>
                        <h2>Apply for this role</h2>
                        <form id="applyForm" className="ui-form" noValidate onSubmit={handleApplySubmit}>
                            <div className="rc-form-grid">
                                <div>
                                    <label className="ui-field-label" htmlFor="applyName">Full name *</label>
                                    <input
                                        className="ui-input"
                                        id="applyName"
                                        name="name"
                                        maxLength={100}
                                        required
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        autoComplete="name"
                                    />
                                </div>
                                <div>
                                    <label className="ui-field-label" htmlFor="applyEmail">Email *</label>
                                    <input
                                        className="ui-input"
                                        id="applyEmail"
                                        name="email"
                                        type="email"
                                        required
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        autoComplete="email"
                                    />
                                </div>
                                <div>
                                    <label className="ui-field-label" htmlFor="applyPhone">Phone</label>
                                    <input
                                        className="ui-input"
                                        id="applyPhone"
                                        name="phone"
                                        type="tel"
                                        maxLength={40}
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        autoComplete="tel"
                                    />
                                </div>
                                <div>
                                    <label className="ui-field-label" htmlFor="applyLinkedin">LinkedIn or portfolio URL</label>
                                    <input
                                        className="ui-input"
                                        id="applyLinkedin"
                                        name="linkedin"
                                        type="url"
                                        maxLength={300}
                                        placeholder="https://"
                                        value={linkedin}
                                        onChange={e => setLinkedin(e.target.value)}
                                    />
                                </div>
                            </div>

                            <label className="ui-field-label" htmlFor="applyResume">Resume * (PDF or Word, up to 5 MB)</label>
                            <input
                                ref={resumeInputRef}
                                className="rc-file-input"
                                id="applyResume"
                                name="resume"
                                type="file"
                                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                                required
                            />

                            <label className="ui-field-label" htmlFor="applyCover">Cover letter</label>
                            <textarea
                                className="ui-input ui-textarea"
                                id="applyCover"
                                name="coverLetter"
                                rows={6}
                                maxLength={5000}
                                placeholder="Tell us why you're excited about this role"
                                value={coverLetter}
                                onChange={e => setCoverLetter(e.target.value)}
                            />

                            <p className={`ui-error ${formError ? '' : 'hidden'}`} id="applyError">
                                {formError}
                            </p>

                            <div className="ui-dialog-actions" style={{ justifyContent: 'flex-start' }}>
                                <button
                                    type="submit"
                                    className="ui-btn ui-btn-primary"
                                    disabled={submitting}
                                >
                                    {submitting ? 'Submitting…' : 'Submit application'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </section>
        </div>
    );
}

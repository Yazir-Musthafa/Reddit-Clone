import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../AuthContext.jsx';
import { api } from '../../js/api.js';
import { debounce } from '../../js/utils.js';
import { showToast } from '../Toasts.jsx';

const TOPICS = [
    { icon: '🎏', label: 'Anime & Cosplay' },
    { icon: '🎓', label: 'Art' },
    { icon: '💵', label: 'Business & Finance' },
    { icon: '☘️', label: 'Collectibles & Other Hobbies' },
    { icon: '🛡️', label: 'Education & Career' },
    { icon: '🧴', label: 'Fashion & Beauty' },
    { icon: '🍔', label: 'Food & Drinks' },
    { icon: '🕹️', label: 'Games' },
    { icon: '❤️', label: 'Health' },
    { icon: '🏡', label: 'Home & Garden' },
    { icon: '📜', label: 'Humanities & Law' },
    { icon: '🌈', label: 'Identity & Relationships' },
    { icon: '🏫', label: 'Internet Culture' },
    { icon: '🎬', label: 'Movies & TV' },
    { icon: '🎶', label: 'Music' },
    { icon: '🌿', label: 'Nature & Outdoors' },
    { icon: '📰', label: 'News & Politics' },
    { icon: '🌐', label: 'Places & Travel' },
    { icon: '✨', label: 'Pop Culture' },
    { icon: '✏️', label: 'Q&As & Stories' },
    { icon: '📖', label: 'Reading & Writing' },
    { icon: '🧪', label: 'Sciences' },
    { icon: '👻', label: 'Spooky' },
    { icon: '🏅', label: 'Sports' },
    { icon: '⚡', label: 'Technology' },
    { icon: '🚜', label: 'Vehicles' },
    { icon: '🧘', label: 'Wellness' },
    { icon: '🔴', label: 'Adult Content' },
    { icon: '🔴', label: 'Mature Topics' }
];

export default function CommunityModal() {
    const { communityModalOpen, closeCommunityModal, setUser } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState(1);
    const [topic, setTopic] = useState('Art');
    const [commType, setCommType] = useState('Public');
    const [mature, setMature] = useState(false);

    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    const [nameStatus, setNameStatus] = useState('');
    const [nameAvailable, setNameAvailable] = useState(false);
    const [error, setError] = useState('');
    const [baseColor, setBaseColor] = useState('#FF87A2');

    // Reset when modal opens
    useEffect(() => {
        if (communityModalOpen) {
            setStep(1);
            setTopic('Art');
            setCommType('Public');
            setMature(false);
            setName('');
            setDesc('');
            setNameStatus('');
            setNameAvailable(false);
            setError('');
            setBaseColor('#FF87A2');
        }
    }, [communityModalOpen]);

    // Check name availability debounce
    const checkName = useRef(
        debounce(async (val) => {
            if (!val.trim()) {
                setNameStatus('');
                setNameAvailable(false);
                return;
            }
            try {
                const res = await api.get(`/communities/check-name?name=${encodeURIComponent(val.trim())}`);
                setNameAvailable(res.available);
                setNameStatus(res.message);
            } catch {
                setNameAvailable(false);
            }
        }, 300)
    ).current;

    const handleNameChange = (e) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
        setName(val);
        checkName(val);
    };

    const handleCreateSubmit = async () => {
        if (!name.trim() || !desc.trim()) return;
        setError('');
        try {
            const res = await api.post('/communities', {
                name: name.trim(),
                description: desc.trim(),
                type: commType,
                mature,
                topic
            });
            if (res.user) setUser(res.user);
            setStep(5);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleGoToCommunity = (modTools = false) => {
        closeCommunityModal();
        navigate(`/community.html?name=${encodeURIComponent(name.trim())}${modTools ? '&modtools=1' : ''}`);
    };

    if (!communityModalOpen) return null;

    return (
        <div className="community-modal-backdrop" id="communityModalBackdrop" onClick={(e) => {
            if (e.target.id === 'communityModalBackdrop') closeCommunityModal();
        }}>
            <div className="community-modal-card" id="communityModalCard">
                {/* STEP 1: Topic selection */}
                {step === 1 && (
                    <div className="modal-step-content active" id="modalStep1">
                        <header className="modal-header">
                            <div>
                                <h2 className="modal-title">What will your community be about?</h2>
                                <p className="modal-subtitle">Choose a topic to help redditors discover your community</p>
                            </div>
                            <button
                                type="button"
                                className="btn-modal-close"
                                id="btnCloseCommunityModal"
                                aria-label="Close"
                                onClick={closeCommunityModal}
                            >
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </header>

                        <div className="topics-grid-container" id="topicsGrid">
                            {TOPICS.map(t => (
                                <button
                                    key={t.label}
                                    type="button"
                                    className={`topic-pill${topic === t.label ? ' selected active' : ''}`}
                                    data-topic={t.label}
                                    onClick={() => setTopic(t.label)}
                                >
                                    <span>{t.icon}</span> {t.label}
                                </button>
                            ))}
                        </div>

                        <footer className="modal-footer">
                            <div className="step-dots-indicator">
                                <span className="dot active"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                            <div className="footer-btn-group">
                                <button type="button" className="btn-modal-cancel" id="btnCancelStep1" onClick={closeCommunityModal}>
                                    Cancel
                                </button>
                                <button type="button" className="btn-modal-next active" id="btnNextStep1" onClick={() => setStep(2)}>
                                    Next
                                </button>
                            </div>
                        </footer>
                    </div>
                )}

                {/* STEP 2: Community type */}
                {step === 2 && (
                    <div className="modal-step-content active" id="modalStep2">
                        <header className="modal-header">
                            <div>
                                <h2 className="modal-title">What kind of community is this?</h2>
                                <p className="modal-subtitle">
                                    Decide who can view and contribute in your community. Only public communities show up in search. <strong>Important</strong>: Once set, you will need to submit a request to change your community type.
                                </p>
                            </div>
                            <button type="button" className="btn-modal-close btnCloseModal" onClick={closeCommunityModal}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </header>

                        <div className="community-type-options">
                            {['Public', 'Restricted', 'Private'].map(type => (
                                <label key={type} className={`type-option-card${commType === type ? ' active' : ''}`}>
                                    <div className="type-option-icon">
                                        {type === 'Public' ? '🌐' : type === 'Restricted' ? '👁️' : '🔒'}
                                    </div>
                                    <div className="type-option-info">
                                        <strong>{type}</strong>
                                        <p>
                                            {type === 'Public'
                                                ? 'Anyone can view, post, and comment to this community'
                                                : type === 'Restricted'
                                                ? 'Anyone can view, but only approved users can contribute'
                                                : 'Only approved users can view and contribute'}
                                        </p>
                                    </div>
                                    <input
                                        type="radio"
                                        name="commType"
                                        value={type}
                                        checked={commType === type}
                                        onChange={() => setCommType(type)}
                                        className="type-radio"
                                    />
                                    <span className="radio-custom"></span>
                                </label>
                            ))}

                            <div className="drawer-divider" style={{ margin: '16px 0' }}></div>

                            <div className="mature-toggle-row">
                                <div className="mature-info">
                                    <strong>Mature (18+)</strong>
                                    <p>Users must be over 18 to view and contribute</p>
                                </div>
                                <label className="toggle-switch">
                                    <input
                                        type="checkbox"
                                        id="matureToggleInput"
                                        checked={mature}
                                        onChange={e => setMature(e.target.checked)}
                                    />
                                    <span className="switch-slider"></span>
                                </label>
                            </div>

                            <p className="modal-legal-note">
                                By continuing, you agree to our <a href="page.html?p=mod-code-of-conduct" target="_blank" rel="noreferrer">Mod Code of Conduct</a> and acknowledge that you understand the <a href="page.html?p=rules" target="_blank" rel="noreferrer">Reddit Rules</a>.
                            </p>
                        </div>

                        <footer className="modal-footer">
                            <div className="step-dots-indicator">
                                <span className="dot"></span>
                                <span className="dot active"></span>
                                <span className="dot"></span>
                                <span className="dot"></span>
                            </div>
                            <div className="footer-btn-group">
                                <button type="button" className="btn-modal-cancel" id="btnBackStep2" onClick={() => setStep(1)}>
                                    Back
                                </button>
                                <button type="button" className="btn-modal-next active" id="btnNextStep2" onClick={() => setStep(3)}>
                                    Next
                                </button>
                            </div>
                        </footer>
                    </div>
                )}

                {/* STEP 3: Name & Description */}
                {step === 3 && (
                    <div className="modal-step-content active" id="modalStep3">
                        <header className="modal-header">
                            <div>
                                <h2 className="modal-title">Tell us about your community</h2>
                                <p className="modal-subtitle">A name and description help people understand what your community is all about.</p>
                            </div>
                            <button type="button" className="btn-modal-close btnCloseModal" onClick={closeCommunityModal}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </header>

                        <div className="name-desc-flex-container">
                            <div className="inputs-column">
                                <div className="input-field-group">
                                    <label className="input-label">Community name <span className="req-star">*</span></label>
                                    <div className="text-input-wrapper">
                                        <span className="input-prefix">r/</span>
                                        <input
                                            type="text"
                                            id="commNameInput"
                                            maxLength={21}
                                            placeholder="communityname"
                                            autoComplete="off"
                                            value={name}
                                            onChange={handleNameChange}
                                        />
                                    </div>
                                    <span className="char-count" id="commNameCharCount">{name.length}/21</span>
                                    <span className="rc-name-status" id="commNameStatus" style={{ color: nameAvailable ? '' : '#D93A00' }}>
                                        {nameStatus}
                                    </span>
                                </div>

                                <div className="input-field-group">
                                    <label className="input-label">Description <span className="req-star">*</span></label>
                                    <textarea
                                        id="commDescInput"
                                        rows={4}
                                        maxLength={500}
                                        placeholder="Tell us what your community is about..."
                                        value={desc}
                                        onChange={e => setDesc(e.target.value)}
                                    />
                                    <span className="char-count" id="commDescCharCount">{desc.length}/500</span>
                                </div>
                            </div>

                            <div className="preview-column">
                                <div className="live-community-card-preview">
                                    <div className="preview-card-header">
                                        <div className="preview-avatar avatar-orange-snoo">
                                            <span>r/</span>
                                        </div>
                                        <div className="preview-header-info">
                                            <h4 className="preview-comm-name" id="previewCommName">r/{name || 'communityname'}</h4>
                                            <span className="preview-stats">1 weekly visitor • 1 weekly contributor</span>
                                        </div>
                                    </div>
                                    <p className="preview-desc-text" id="previewDescText">{desc || 'Your community description'}</p>
                                </div>
                            </div>
                        </div>

                        <footer className="modal-footer">
                            {error && <p className="ui-error" id="communityCreateError">{error}</p>}
                            <div className="step-dots-indicator">
                                <span className="dot"></span>
                                <span className="dot"></span>
                                <span className="dot active"></span>
                                <span className="dot"></span>
                            </div>
                            <div className="footer-btn-group">
                                <button type="button" className="btn-modal-cancel" id="btnBackStep3" onClick={() => setStep(2)}>
                                    Back
                                </button>
                                <button
                                    type="button"
                                    className={`btn-modal-next btn-create-comm${name.trim() && desc.trim() ? ' active' : ''}`}
                                    id="btnCreateCommunitySubmit"
                                    onClick={handleCreateSubmit}
                                >
                                    Create Community
                                </button>
                            </div>
                        </footer>
                    </div>
                )}

                {/* STEP 5: Celebration Confetti */}
                {step === 5 && (
                    <div className="modal-step-content active" id="modalStep5">
                        <header className="modal-header">
                            <div></div>
                            <button type="button" className="btn-modal-close btnCloseModal" onClick={closeCommunityModal}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        </header>

                        <div className="celebration-flex-container">
                            <div className="celebration-left-info">
                                <h2 className="celebration-main-title">You launched a new community!</h2>
                                <p className="celebration-sub-info">Here's what you should know</p>
                                <p className="celebration-desc-p">We've applied some settings to help you get started. You can view and edit them anytime in your mod tools.</p>

                                <div className="checklist-pills-row">
                                    <div className="check-pill">✔ Rules</div>
                                    <div className="check-pill">✔ Welcome guide</div>
                                </div>
                            </div>

                            <div className="celebration-right-card">
                                <div className="celebrated-comm-card" id="celebrationCardBg" style={{ backgroundColor: baseColor }}>
                                    <button type="button" className="edit-icon-circle circle-top-right" id="celebrationEditBtn" title="Edit community">✏️</button>

                                    <div className="card-inner-box">
                                        <div className="celebrated-avatar-circle">
                                            <span>r/</span>
                                            <button type="button" className="edit-icon-tiny" id="celebrationIconEditBtn" title="Edit community">✏️</button>
                                        </div>
                                        <h3 className="celebrated-title" id="celebratedCommName">r/{name}</h3>
                                        <span className="celebrated-stats">1 weekly visitor • 1 weekly contributor</span>
                                        <p className="celebrated-desc" id="celebratedCommDesc">{desc}</p>

                                        <label className="btn-base-color" htmlFor="celebrationColorInput">
                                            <span>✏️ Base Color</span>
                                            <span className="color-dot-pink" id="celebrationColorDot" style={{ backgroundColor: baseColor }}></span>
                                            <input
                                                type="color"
                                                id="celebrationColorInput"
                                                value={baseColor}
                                                className="rc-visually-hidden"
                                                onChange={e => setBaseColor(e.target.value)}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <footer className="modal-footer">
                            <div></div>
                            <div className="footer-btn-group">
                                <button type="button" className="btn-modal-cancel" id="btnGoToCommunity" onClick={() => handleGoToCommunity(false)}>
                                    Go To Community Page
                                </button>
                                <button type="button" className="btn-modal-next active" id="btnViewNextSteps" onClick={() => handleGoToCommunity(true)}>
                                    View Next Steps
                                </button>
                            </div>
                        </footer>
                    </div>
                )}
            </div>
        </div>
    );
}

const { Schema, model, Types } = require('mongoose');

const jobSchema = new Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    department: { type: String, required: true, index: true },
    location: { type: String, required: true },
    type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship'], default: 'Full-time' },
    remote: { type: Boolean, default: false },
    summary: { type: String, required: true },
    responsibilities: [String],
    requirements: [String],
    open: { type: Boolean, default: true }
}, { timestamps: true });

const applicationSchema = new Schema({
    job: { type: Types.ObjectId, ref: 'Job', required: true, index: true },
    user: { type: Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, maxlength: 200 },
    phone: { type: String, default: '', maxlength: 40 },
    linkedin: { type: String, default: '', maxlength: 300 },
    coverLetter: { type: String, default: '', maxlength: 5000 },
    // Stored outside the public uploads folder; never served over HTTP.
    resumeFile: { type: String, default: '' },
    resumeName: { type: String, default: '' },
    status: { type: String, enum: ['Submitted', 'In review', 'Interviewing', 'Closed'], default: 'Submitted' }
}, { timestamps: true });
applicationSchema.index({ job: 1, email: 1 }, { unique: true });

const pressReleaseSchema = new Schema({
    title: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    summary: { type: String, required: true },
    body: { type: String, required: true },      // trusted HTML written by the site owner (seed data)
    category: { type: String, default: 'Announcement' },
    publishedAt: { type: Date, required: true, index: true }
}, { timestamps: true });

const pressInquirySchema = new Schema({
    name: { type: String, required: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, maxlength: 200 },
    outlet: { type: String, required: true, maxlength: 150 },
    topic: { type: String, required: true, maxlength: 150 },
    message: { type: String, required: true, maxlength: 5000 },
    deadline: { type: Date, default: null }
}, { timestamps: true });

module.exports = {
    Job: model('Job', jobSchema),
    JobApplication: model('JobApplication', applicationSchema),
    PressRelease: model('PressRelease', pressReleaseSchema),
    PressInquiry: model('PressInquiry', pressInquirySchema)
};

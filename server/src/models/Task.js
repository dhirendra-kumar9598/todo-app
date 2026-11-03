import mongoose from 'mongoose';

export const PRIORITIES = ['low', 'medium', 'high'];
export const STATUSES = ['in_progress', 'completed'];

const taskSchema = new mongoose.Schema(
  {
    // Anonymous client id (X-Client-Id header) that owns the task.
    ownerId: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, default: '', maxlength: 2000 },
    // Date + start time of the task (UTC). Drives weekly grouping.
    startAt: { type: Date, required: true },
    endAt: {
      type: Date,
      default: null,
      validate: {
        validator(value) {
          return !value || !this.startAt || value >= this.startAt;
        },
        message: 'endAt must be on or after startAt',
      },
    },
    priority: { type: String, enum: PRIORITIES, default: null },
    status: { type: String, enum: STATUSES, default: 'in_progress' },
    completedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      versionKey: false,
      transform(_doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.ownerId;
        return ret;
      },
    },
  },
);

// Every query is scoped by owner, then filtered/sorted by date.
taskSchema.index({ ownerId: 1, startAt: 1 });
taskSchema.index({ ownerId: 1, status: 1, startAt: 1 });

taskSchema.pre('save', function syncCompletedAt() {
  if (this.isNew || this.isModified('status')) {
    this.completedAt = this.status === 'completed' ? new Date() : null;
  }
});

export const Task = mongoose.model('Task', taskSchema);

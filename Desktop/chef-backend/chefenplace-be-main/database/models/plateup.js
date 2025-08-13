const mongoose = require("mongoose")

const plateUpsSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    image: {
      url: String,
      publicId: String,
    },
    folder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlateupFolder',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  },
)

// Update folder plateup count on save
plateUpsSchema.post('save', async function () {
  if (this.folder) {
    const Folder = mongoose.model('PlateupFolder');
    const count = await mongoose.model('PlateUp').countDocuments({
      folder: this.folder,
    });
    await Folder.findByIdAndUpdate(this.folder, { plateupCount: count });
  }
});

// Update folder plateup count on remove
plateUpsSchema.post('remove', async function () {
  if (this.folder) {
    const Folder = mongoose.model('PlateupFolder');
    const count = await mongoose.model('PlateUp').countDocuments({
      folder: this.folder,
    });
    await Folder.findByIdAndUpdate(this.folder, { plateupCount: count });
  }
});

module.exports = mongoose.model("PlateUp", plateUpsSchema)

// Settings Page - Profile Toggle Functions

// Global function to show profile form - called from HTML onclick
function showProfileForm() {
    var settingsCard = document.querySelector(".settings-card");
    var profileFormSection = document.getElementById("profile-form-section");

    if (settingsCard) settingsCard.classList.add("hidden");
    if (profileFormSection) {
        profileFormSection.classList.remove("hidden");
        loadProfileData();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    var profileInfoItem = document.getElementById("profile-info-item");
    if (profileInfoItem) {
        profileInfoItem.addEventListener("click", function() {
            showProfileForm();
        });
    }

    // Initialize profile photo preview
    var photoInput = document.getElementById("profile-photo-input");
    var preview = document.getElementById("profile-preview");

    if (photoInput && preview) {
        photoInput.addEventListener("change", function() {
            var file = this.files[0];
            if (file) {
                preview.src = URL.createObjectURL(file);
            }
        });
    }

    // Initialize update profile button
    var updateProfileBtn = document.getElementById("update-profile-btn");
    if (updateProfileBtn) {
        updateProfileBtn.addEventListener("click", handleProfileUpdate);
    }
});

// Back to settings function
function goBackToSettings() {
    var settingsCard = document.querySelector(".settings-card");
    var profileFormSection = document.getElementById("profile-form-section");

    if (settingsCard) settingsCard.classList.remove("hidden");
    if (profileFormSection) profileFormSection.classList.add("hidden");
}

// Handle profile update with photo upload
async function handleProfileUpdate() {
    var firstName = document.getElementById("firstName")?.value;
    var lastName = document.getElementById("lastName")?.value;
    var phone = document.getElementById("phone")?.value;
    var address = document.getElementById("address")?.value;
    var photoInput = document.getElementById("profile-photo-input");

    var formData = new FormData();
    if (firstName) formData.append("firstName", firstName);
    if (lastName) formData.append("lastName", lastName);
    if (phone) formData.append("phone", phone);
    if (address) formData.append("address", address);
    if (photoInput && photoInput.files[0]) {
        formData.append("avatar", photoInput.files[0]);
    }

    try {
        var token = localStorage.getItem("token");
        var response = await fetch("/api/users/profile", {
            method: "PUT",
            headers: {
                "Authorization": "Bearer " + token
            },
            body: formData
        });

        var data = await response.json();

        if (data.success) {
            showToast("Profile Updated Successfully");
            if (data.avatar) {
                var headAvatar = document.getElementById("head-avatar");
                if (headAvatar) headAvatar.src = data.avatar;
            }
            goBackToSettings();
        } else {
            showToast(data.message || "Update Failed");
        }
    } catch (error) {
        console.error("Profile update error:", error);
        showToast("Update Failed - " + error.message);
    }
}

// Load profile data into form
function loadProfileData() {
    var token = localStorage.getItem("token");
    if (!token) return;

    fetch("/api/users/profile", {
        headers: {
            "Authorization": "Bearer " + token
        }
    })
    .then(function(response) { return response.json(); })
    .then(function(data) {
        if (data.firstName) {
            var firstNameInput = document.getElementById("firstName");
            var lastNameInput = document.getElementById("lastName");
            var phoneInput = document.getElementById("phone");
            var addressInput = document.getElementById("address");
            var previewImg = document.getElementById("profile-preview");

            if (firstNameInput) firstNameInput.value = data.firstName;
            if (lastNameInput) lastNameInput.value = data.lastName || "";
            if (phoneInput) phoneInput.value = data.phone || "";
            if (addressInput) addressInput.value = data.address || "";
            if (previewImg && data.avatar) previewImg.src = data.avatar;
        }
    })
    .catch(function(error) { console.error("Error loading profile:", error); });
}

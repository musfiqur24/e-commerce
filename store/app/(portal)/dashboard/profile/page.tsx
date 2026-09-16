"use client";

import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Calendar } from "@medusajs/icons";
import {
  FloatingInput,
  FloatingSelect,
} from "@/components/portal/FloatingField";
import PageContainer from "@/components/portal/PageContainer";
import TopImageBanner from "@/components/portal/TopImageBanner";
import Loading from "@/components/portal/Loading";
import Toast from "@/components/portal/Toast";
import { Button } from "@medusajs/ui";

type ProfileData = {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  gender: string;
  date_of_birth: string;
  address: string;
  city: string;
  state: string;
  zip: string;
};

const EMPTY: ProfileData = {
  firstname: "",
  lastname: "",
  email: "",
  phone: "",
  gender: "",
  date_of_birth: "",
  address: "",
  city: "",
  state: "",
  zip: "",
};

export default function ProfilePage() {
  const { user, isLoaded } = useUser();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<ProfileData>(EMPTY);
  const [isSaving, setIsSaving] = useState(false);

  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    variant: "success" | "error" | "info" | "warning";
  }>({ isOpen: false, message: "", variant: "success" });

  const showToast = (
    message: string,
    variant: "success" | "error" | "info" | "warning" = "success",
  ) => setToast({ isOpen: true, message, variant });

  useEffect(() => {
    if (!isLoaded) return;
    if (user) {
      const meta = (user.unsafeMetadata || {}) as Record<string, string>;
      setFormData({
        firstname: user.firstName || "",
        lastname: user.lastName || "",
        email: user.primaryEmailAddress?.emailAddress || "",
        phone: user.primaryPhoneNumber?.phoneNumber || meta.phone || "",
        gender: meta.gender || "",
        date_of_birth: meta.date_of_birth || "",
        address: meta.address || "",
        city: meta.city || "",
        state: meta.state || "NSW",
        zip: meta.zip || "",
      });
    }
    setLoading(false);
  }, [isLoaded, user]);

  const set = (field: keyof ProfileData, value: string) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await user.update({
        firstName: formData.firstname,
        lastName: formData.lastname,
        unsafeMetadata: {
          ...user.unsafeMetadata,
          phone: formData.phone,
          gender: formData.gender,
          date_of_birth: formData.date_of_birth,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          zip: formData.zip,
        },
      });
      showToast("Profile updated successfully", "success");
    } catch (err) {
      console.error("Error updating profile:", err);
      showToast("Failed to update profile", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <Loading layout="profile" message="Loading profile details" />;
  }

  return (
    <PageContainer
      breadcrumb={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Profile" },
      ]}
    >
      <div className="space-y-4">
        <TopImageBanner title="Profile" />

        <form
          onSubmit={handleSave}
          className="bg-white border border-neutral-200 rounded-xl px-6 pt-4 pb-8 md:px-16 lg:px-24 md:pt-6 md:pb-10 shadow-sm space-y-6"
        >
          {/* Personal Details */}
          <div className="bg-neutral-100 border border-neutral-100 rounded-xl p-5">
            <h2 className="text-[13px] font-medium text-neutral-900 mb-4 px-1">
              Personal Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FloatingInput
                label="First Name"
                value={formData.firstname}
                onChange={(v) => set("firstname", v)}
              />
              <FloatingInput
                label="Last Name"
                value={formData.lastname}
                onChange={(v) => set("lastname", v)}
              />
              <FloatingInput
                label="Phone Number"
                value={formData.phone}
                onChange={(v) => set("phone", v)}
              />
              <FloatingInput
                label="Email"
                value={formData.email}
                onChange={() => {}}
                disabled
              />
              <FloatingSelect
                label="Gender"
                value={formData.gender}
                onChange={(v) => set("gender", v)}
                options={[
                  { value: "Male", label: "Male" },
                  { value: "Female", label: "Female" },
                  { value: "Non-binary", label: "Non-binary" },
                  { value: "Prefer not to say", label: "Prefer not to say" },
                ]}
              />
              <FloatingInput
                label="Date of Birth"
                type="date"
                value={formData.date_of_birth}
                onChange={(v) => set("date_of_birth", v)}
                leftAdornment={<Calendar className="w-4 h-4" />}
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-neutral-100 border border-neutral-100 rounded-xl p-5">
            <h2 className="text-[13px] font-medium text-neutral-900 mb-4 px-1">
              Shipping Address
            </h2>
            <div className="space-y-3">
              <FloatingInput
                label="Street Address"
                value={formData.address}
                onChange={(v) => set("address", v)}
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FloatingInput
                  label="Suburb / Town"
                  value={formData.city}
                  onChange={(v) => set("city", v)}
                />
                <FloatingSelect
                  label="State"
                  value={formData.state}
                  onChange={(v) => set("state", v)}
                  options={[
                    { value: "ACT", label: "ACT" },
                    { value: "NSW", label: "NSW" },
                    { value: "NT", label: "NT" },
                    { value: "QLD", label: "QLD" },
                    { value: "SA", label: "SA" },
                    { value: "TAS", label: "TAS" },
                    { value: "VIC", label: "VIC" },
                    { value: "WA", label: "WA" },
                  ]}
                />
                <FloatingInput
                  label="Post Code"
                  value={formData.zip}
                  onChange={(v) => set("zip", v)}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-neutral-900 text-white hover:bg-neutral-800 px-6 py-2.5 rounded-lg"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>

      <Toast
        isOpen={toast.isOpen}
        onClose={() => setToast((prev) => ({ ...prev, isOpen: false }))}
        message={toast.message}
        variant={toast.variant}
      />
    </PageContainer>
  );
}

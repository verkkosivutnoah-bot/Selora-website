-- Selora calendar features patch
-- Run this in the Supabase SQL editor after the base schema

-- Add 'type' column to appointments (appointment | availability)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'appointment';

-- Add contact reference column (in addition to the existing contact_id if any)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS contact_id_ref UUID REFERENCES public.contacts(id) ON DELETE SET NULL;

-- Index on type for fast filtering
CREATE INDEX IF NOT EXISTS idx_appointments_type ON public.appointments(type);

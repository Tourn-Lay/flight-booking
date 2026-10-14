import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z
  .object({
    first_name: z.string().min(1, "First name is required"),
    last_name: z.string().min(1, "Last name is required"),
    email: z.string().min(1, "Email is required").email("Enter a valid email"),
    phone: z.string().optional(),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  phone: z.string().optional(),
});

export const searchSchema = z
  .object({
    origin: z.string().min(1, "Choose an origin"),
    destination: z.string().min(1, "Choose a destination"),
    date: z.string().min(1, "Choose a departure date"),
    passengers: z.number().int().min(1).max(9),
    cabin_class: z.enum(["ECONOMY", "BUSINESS"]),
  })
  .refine((v) => v.origin !== v.destination, { path: ["destination"], message: "Destination must differ from origin" });

export const airportSchema = z.object({
  code: z.string().regex(/^[A-Za-z]{3,4}$/, "3-4 letters, e.g. PNH"),
  name: z.string().min(1, "Name is required"),
  city: z.string().min(1, "City is required"),
  country: z.string().min(1, "Country is required"),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export const aircraftSchema = z.object({
  aircraft_code: z.string().min(1, "Code is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  model: z.string().min(1, "Model is required"),
  total_seats: z.number({ invalid_type_error: "Enter a number" }).int().min(4, "At least 4 seats").max(600),
  business_seats: z.number({ invalid_type_error: "Enter a number" }).int().min(0),
  status: z.enum(["ACTIVE", "MAINTENANCE", "INACTIVE"]),
});

export const flightSchema = z
  .object({
    flight_number: z.string().regex(/^[A-Za-z0-9]{2}-\d{3,4}$/, "Format: G7-101"),
    aircraft: z.string().min(1, "Choose an aircraft"),
    origin: z.string().min(1, "Choose an origin"),
    destination: z.string().min(1, "Choose a destination"),
    departure_datetime: z.string().min(1, "Required"),
    arrival_datetime: z.string().min(1, "Required"),
    economy_price: z.number({ invalid_type_error: "Enter a price" }).positive("Must be greater than 0"),
    business_price: z.number({ invalid_type_error: "Enter a price" }).positive("Must be greater than 0"),
  })
  .refine((v) => v.origin !== v.destination, { path: ["destination"], message: "Destination must differ from origin" })
  .refine((v) => !v.departure_datetime || !v.arrival_datetime || v.arrival_datetime > v.departure_datetime, {
    path: ["arrival_datetime"],
    message: "Arrival must be after departure",
  });

/** Passenger form schema; passport fields become mandatory on international routes. */
export function passengerSchema(requirePassport: boolean) {
  return z
    .object({
      first_name: z.string().min(1, "First name is required"),
      last_name: z.string().min(1, "Last name is required"),
      gender: z.enum(["M", "F", "O"], { errorMap: () => ({ message: "Select a gender" }) }),
      date_of_birth: z
        .string()
        .min(1, "Date of birth is required")
        .refine((v) => v <= new Date().toISOString().slice(0, 10), "Date of birth cannot be in the future"),
      nationality: z.string().min(1, "Nationality is required"),
      passport_number: z.string().optional(),
      passport_expiry: z.string().optional(),
    })
    .superRefine((v, ctx) => {
      if (requirePassport && !v.passport_number) {
        ctx.addIssue({ code: "custom", path: ["passport_number"], message: "Passport number is required for international flights" });
      }
      if ((requirePassport || v.passport_number) && !v.passport_expiry) {
        ctx.addIssue({ code: "custom", path: ["passport_expiry"], message: "Passport expiry is required" });
      }
      if (v.passport_expiry && v.passport_expiry <= new Date().toISOString().slice(0, 10)) {
        ctx.addIssue({ code: "custom", path: ["passport_expiry"], message: "Passport has expired" });
      }
    });
}

export const passengersFormSchema = (requirePassport: boolean) =>
  z.object({ passengers: z.array(passengerSchema(requirePassport)) });

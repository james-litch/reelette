SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- \restrict warAoEQmnqpNRXgtdfifBu2Ck0mo7PfbwmwoVbcMWSPT8Yqq0gLzyvnhM3kcf9t

-- Dumped from database version 17.11
-- Dumped by pg_dump version 17.11

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: custom_oauth_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at", "invite_token", "referrer", "oauth_client_state_id", "linking_target_id", "email_optional") VALUES
	('2767172a-2ba0-47c3-8bde-ceefaf8d5997', NULL, '8246a027-1fb8-4937-8679-6dd877f556b5', 's256', '_Gd3ruo6D5YkQvAC4MX4jwrCap1lbG_NPSNM8pHDWas', 'google', '', '', '2026-11-05 13:45:15.146894+00', '2026-11-05 13:45:15.146894+00', 'oauth', NULL, NULL, 'http://localhost:3000/auth/callback', NULL, NULL, false);


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'b791957a-343c-4ae2-80c5-1f8685dd355e', 'authenticated', 'authenticated', 'james.litchfield99@gmail.com', NULL, '2026-11-05 13:46:14.690608+00', NULL, '', NULL, '', NULL, '', '', NULL, '2026-11-05 13:57:14.294524+00', '{"provider": "google", "providers": ["google"]}', '{"iss": "https://accounts.google.com", "sub": "100754014815095129744", "name": "James", "email": "james.litchfield99@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocIPhCaw-AZGzkzy2-ZxeZLq4j5wfe3TtrmOExN5dzB_kLNSfvw=s96-c", "full_name": "James", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocIPhCaw-AZGzkzy2-ZxeZLq4j5wfe3TtrmOExN5dzB_kLNSfvw=s96-c", "provider_id": "100754014815095129744", "email_verified": true, "phone_verified": false}', NULL, '2026-11-05 13:46:14.670355+00', '2026-11-05 13:57:14.302508+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('100754014815095129744', 'b791957a-343c-4ae2-80c5-1f8685dd355e', '{"iss": "https://accounts.google.com", "sub": "100754014815095129744", "name": "James", "email": "james.litchfield99@gmail.com", "picture": "https://lh3.googleusercontent.com/a/ACg8ocIPhCaw-AZGzkzy2-ZxeZLq4j5wfe3TtrmOExN5dzB_kLNSfvw=s96-c", "full_name": "James", "avatar_url": "https://lh3.googleusercontent.com/a/ACg8ocIPhCaw-AZGzkzy2-ZxeZLq4j5wfe3TtrmOExN5dzB_kLNSfvw=s96-c", "provider_id": "100754014815095129744", "email_verified": true, "phone_verified": false}', 'google', '2026-11-05 13:46:14.682822+00', '2026-11-05 13:46:14.68287+00', '2026-11-05 13:57:14.040795+00', '54ad355c-a324-4b9d-9420-fbc72daafaa0');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_clients; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag", "oauth_client_id", "refresh_token_hmac_key", "refresh_token_counter", "scopes") VALUES
	('587620d6-5821-495d-826a-e6be80235951', 'b791957a-343c-4ae2-80c5-1f8685dd355e', '2026-11-05 13:57:14.295652+00', '2026-11-05 13:57:14.295652+00', NULL, 'aal1', NULL, NULL, 'node', '82.20.158.130', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('587620d6-5821-495d-826a-e6be80235951', '2026-11-05 13:57:14.304198+00', '2026-11-05 13:57:14.304198+00', 'oauth', '7666e50d-035a-4139-b65f-7ab9089ec148');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_recovery_code_sets; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_recovery_codes; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_authorizations; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_client_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: oauth_consents; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 2, 'gqrryiejzm5f', 'b791957a-343c-4ae2-80c5-1f8685dd355e', false, '2026-11-05 13:57:14.298647+00', '2026-11-05 13:57:14.298647+00', NULL, '587620d6-5821-495d-826a-e6be80235951');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: scim_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: scim_users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: webauthn_credentials; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: bucket_lifecycle_states; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_analytics; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: buckets_vectors; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: lifecycle_abandoned_artifacts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: vector_indexes; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 2, true);


--
-- PostgreSQL database dump complete
--

-- \unrestrict warAoEQmnqpNRXgtdfifBu2Ck0mo7PfbwmwoVbcMWSPT8Yqq0gLzyvnhM3kcf9t

RESET ALL;

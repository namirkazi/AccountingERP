import { useEffect, useRef, useState } from "react";

import { Plus } from "lucide-react";

import {
  createCustomer,
  createSupplier,
  searchCustomers,
  searchSuppliers,
} from "../../services/partyService";

import {
  createInvestor,
  searchInvestors,
} from "../../services/investorService";

import styles from "./PartySelector.module.css";

export default function PartySelector({
  value,
  onChange,
  partyType = "customer",
}) {
  const isSupplier = partyType === "supplier";

  const isInvestor = partyType === "investor";

  const label = isInvestor ? "Investor" : isSupplier ? "Supplier" : "Customer";

  const [query, setQuery] = useState(value?.party_name || "");

  const [results, setResults] = useState([]);

  const [open, setOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);

  const [newName, setNewName] = useState("");

  const [newPhone, setNewPhone] = useState("");

  const [newEmail, setNewEmail] = useState("");

  const [newAddress, setNewAddress] = useState("");

  const [creating, setCreating] = useState(false);

  const [createError, setCreateError] = useState("");

  const wrapperRef = useRef(null);

  /*
   * Close dropdown outside click
   */

  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /*
   * Keep input synced with selected party
   */

  useEffect(() => {
    if (value) {
      setQuery(value.party_name || "");
    } else {
      setQuery("");
    }
  }, [value]);

  /*
   * Search
   */

  /*
   * Load parties.
   *
   * Empty query = load the full list.
   * Typed query = filter/search.
   */

  useEffect(() => {
    // Do not load or open the dropdown automatically.
    // Only search after the user has opened the field.
    if (!open) {
      return;
    }

    const trimmed = query.trim();

    const timer = setTimeout(
      async () => {
        try {
          setLoading(true);

          const response = isInvestor
            ? await searchInvestors(trimmed)
            : isSupplier
              ? await searchSuppliers(trimmed)
              : await searchCustomers(trimmed);

          const parties = response?.data?.parties || [];

          // Make sure the selector only displays
          // parties of the correct type.
          const filteredParties = isInvestor
            ? parties.filter((party) => party.party_type === "investor")
            : isSupplier
              ? parties.filter((party) => party.party_type === "supplier")
              : parties.filter((party) => party.party_type === "customer");

          setResults(filteredParties);
          setOpen(true);
        } catch (error) {
          console.error(`${label} search failed:`, error);
          setResults([]);
          setOpen(true);
        } finally {
          setLoading(false);
        }
      },
      trimmed ? 250 : 0,
    );

    return () => clearTimeout(timer);
  }, [query, isSupplier, isInvestor, open]);
  /*
   * Select
   */

  function selectParty(party) {
    setQuery(party.party_name);

    setResults([]);

    setOpen(false);

    onChange(party);
  }

  /*
   * Open create modal
   */

  function openCreate() {
    setNewName(query.trim());

    setNewPhone("");

    setNewEmail("");
    setNewAddress("");
    setCreateError("");
    setNewAddress("");
    setShowCreate(true);

    setOpen(false);
  }

  /*
   * Create party
   */

  async function handleCreate(event) {
    event.preventDefault();

    if (!newName.trim()) {
      setCreateError(`${label} name is required.`);

      return;
    }

    try {
      setCreating(true);

      setCreateError("");

      const payload = {
        name: newName.trim(),

        address: newAddress.trim(),
        phone: newPhone.trim(),

        email: newEmail.trim(),
      };

      const response = isInvestor
        ? await createInvestor(payload)
        : isSupplier
          ? await createSupplier(payload)
          : await createCustomer(payload);

      const party = response?.data?.party;

      if (!party) {
        throw new Error(`Unable to create ${label.toLowerCase()}.`);
      }

      setQuery(party.party_name);

      setShowCreate(false);

      setNewName("");

      setNewPhone("");

      setNewEmail("");
      setNewAddress("");
      setResults([]);

      onChange(party);
    } catch (error) {
      console.error(`${label} creation failed:`, error);

      setCreateError(
        error.message || `Unable to create ${label.toLowerCase()}.`,
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <>
      <div className={styles.wrapper} ref={wrapperRef}>
        <div className={styles.inputWrapper}>
          <input
            value={query}
            placeholder={`Search ${label.toLowerCase()}...`}
            onChange={(event) => {
              setQuery(event.target.value);

              if (value) {
                onChange(null);
              }
            }}
            onFocus={() => {
              setOpen(true);
            }}
          />
        </div>

        {open && (
          <div className={styles.dropdown}>
            {loading && <div className={styles.message}>Searching...</div>}

            {!loading &&
              results.map((party) => (
                <button
                  type="button"
                  key={party.id}
                  className={styles.result}
                  onClick={() => selectParty(party)}
                >
                  <div>
                    <strong>{party.party_name}</strong>

                    {party.phone && <span>{party.phone}</span>}
                  </div>
                </button>
              ))}

            {!loading && results.length === 0 && query.trim() !== "" && (
              <button
                type="button"
                className={styles.addButton}
                onClick={openCreate}
              >
                <Plus size={16} />

                <span>Add "{query.trim()}"</span>
              </button>
            )}
          </div>
        )}
      </div>

      {showCreate && (
        <div className={styles.overlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <span>New {label}</span>

                <h3>Add {label}</h3>
              </div>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.modalField}>
                <label>{label} Name</label>

                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  autoFocus
                  placeholder={`Enter ${label.toLowerCase()} name`}
                />
              </div>

              <div className={styles.modalField}>
                <label>{label} Address</label>

                <textarea
                  value={newAddress}
                  onChange={(event) => setNewAddress(event.target.value)}
                  placeholder="Enter address"
                  rows={3}
                />
              </div>
              <div className={styles.modalField}>
                <label>Phone</label>

                <input
                  type="text"
                  value={newPhone}
                  onChange={(event) => setNewPhone(event.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div className={styles.modalField}>
                <label>TRN</label>

                <input
                  type="text"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="Optional"
                />
              </div>

              {createError && (
                <div className={styles.createError}>{createError}</div>
              )}

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setShowCreate(false)}
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className={styles.createButton}
                  onClick={handleCreate}
                  disabled={creating}
                >
                  {creating ? "Adding..." : `Add ${label}`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

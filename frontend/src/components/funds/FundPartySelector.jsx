import { useEffect, useRef, useState } from "react";

import { Plus } from "lucide-react";

import { createFundParty, searchFundParties } from "../../services/fundService";

import styles from "../accounting/PartySelector.module.css";

export default function FundPartySelector({ value, onChange }) {
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
   * Close dropdown when clicking outside.
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
   * Keep text synced with selected party.
   */
  useEffect(() => {
    setQuery(value?.party_name || "");
  }, [value]);

  /*
   * Search fund_parties.
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(
      async () => {
        try {
          setLoading(true);

          const response = await searchFundParties(query.trim());

          setResults(response?.data?.parties || []);
        } catch (error) {
          console.error("Fund party search failed:", error);

          setResults([]);
        } finally {
          setLoading(false);
        }
      },
      query.trim() ? 250 : 0,
    );

    return () => clearTimeout(timer);
  }, [query, open]);

  function selectParty(party) {
    setQuery(party.party_name);

    setResults([]);

    setOpen(false);

    onChange(party);
  }

  function openCreate() {
    setNewName(query.trim());

    setNewPhone("");
    setNewEmail("");
    setNewAddress("");

    setCreateError("");

    setShowCreate(true);
    setOpen(false);
  }

  async function handleCreate(event) {
    event.preventDefault();

    if (!newName.trim()) {
      setCreateError("Party name is required.");

      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      const response = await createFundParty({
        party_name: newName.trim(),

        phone: newPhone.trim(),

        email: newEmail.trim(),

        address: newAddress.trim(),
      });

      const party = response?.data?.party;

      if (!party) {
        throw new Error("Unable to create party.");
      }

      setShowCreate(false);

      setNewName("");
      setNewPhone("");
      setNewEmail("");
      setNewAddress("");

      selectParty(party);
    } catch (error) {
      setCreateError(error.message || "Unable to create party.");
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
            placeholder="Search party..."
            onChange={(event) => {
              setQuery(event.target.value);

              if (value) {
                onChange(null);
              }
            }}
            onFocus={() => setOpen(true)}
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
                <span>New Party</span>

                <h3>Add Party</h3>
              </div>
            </div>

            <div className={styles.modalForm}>
              <div className={styles.modalField}>
                <label>Party Name</label>

                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  autoFocus
                  placeholder="Enter party name"
                />
              </div>

              <div className={styles.modalField}>
                <label>Address</label>

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
                <label>Email</label>

                <input
                  type="email"
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
                  {creating ? "Adding..." : "Add Party"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

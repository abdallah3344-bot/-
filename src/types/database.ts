// ⚠️ ملف مولَّد تلقائيًا — لا تعدّله يدويًا.
// أعد توليده بعد أي تغيير في قاعدة البيانات:  npm run types:gen

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string
          name: string
          account_type: string
          bank_name: string | null
          account_number: string | null
          iban: string | null
          opening_balance: number
          is_active: boolean
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          account_type?: string
          bank_name?: string | null
          account_number?: string | null
          iban?: string | null
          opening_balance?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          account_type?: string
          bank_name?: string | null
          account_number?: string | null
          iban?: string | null
          opening_balance?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          title: string
          description: string | null
          client_id: string | null
          case_id: string | null
          owner_id: string | null
          starts_at: string
          ends_at: string | null
          location: string | null
          kind: string
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          client_id?: string | null
          case_id?: string | null
          owner_id?: string | null
          starts_at: string
          ends_at?: string | null
          location?: string | null
          kind?: string
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          client_id?: string | null
          case_id?: string | null
          owner_id?: string | null
          starts_at?: string
          ends_at?: string | null
          location?: string | null
          kind?: string
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          id: number
          user_id: string | null
          user_name: string | null
          action: string
          entity: string
          entity_id: string | null
          entity_label: string | null
          summary: string | null
          changes: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: {
          user_id?: string | null
          user_name?: string | null
          action: string
          entity: string
          entity_id?: string | null
          entity_label?: string | null
          summary?: string | null
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Update: {
          user_id?: string | null
          user_name?: string | null
          action?: string
          entity?: string
          entity_id?: string | null
          entity_label?: string | null
          summary?: string | null
          changes?: Json | null
          ip_address?: string | null
          user_agent?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_fees: {
        Row: {
          id: string
          case_id: string
          total_amount: number
          advance_amount: number
          installments_count: number
          installment_amount: number
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          case_id: string
          total_amount?: number
          advance_amount?: number
          installments_count?: number
          installment_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          total_amount?: number
          advance_amount?: number
          installments_count?: number
          installment_amount?: number
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_fees_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_fees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          id: string
          case_id: string
          body: string
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          case_id: string
          body: string
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          body?: string
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_status_history: {
        Row: {
          id: string
          case_id: string
          from_status: string | null
          to_status: string
          reason: string | null
          changed_at: string
          changed_by: string | null
        }
        Insert: {
          id?: string
          case_id: string
          from_status?: string | null
          to_status: string
          reason?: string | null
          changed_at?: string
          changed_by?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          from_status?: string | null
          to_status?: string
          reason?: string | null
          changed_at?: string
          changed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_status_history_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_types: {
        Row: {
          id: string
          name_ar: string
          color: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_ar: string
          color?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          color?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cases: {
        Row: {
          id: string
          internal_no: string
          court_case_no: string | null
          title: string
          client_id: string
          responsible_lawyer_id: string | null
          assistant_lawyer_id: string | null
          case_type_id: string | null
          court_id: string | null
          chamber_id: string | null
          judge_id: string | null
          governorate: string | null
          registered_at: string | null
          first_hearing_at: string | null
          litigation_degree: string | null
          claim_amount: number | null
          priority: string
          status: string
          description: string | null
          notes: string | null
          closed_at: string | null
          close_reason: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          internal_no: string
          court_case_no?: string | null
          title: string
          client_id: string
          responsible_lawyer_id?: string | null
          assistant_lawyer_id?: string | null
          case_type_id?: string | null
          court_id?: string | null
          chamber_id?: string | null
          judge_id?: string | null
          governorate?: string | null
          registered_at?: string | null
          first_hearing_at?: string | null
          litigation_degree?: string | null
          claim_amount?: number | null
          priority?: string
          status?: string
          description?: string | null
          notes?: string | null
          closed_at?: string | null
          close_reason?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          internal_no?: string
          court_case_no?: string | null
          title?: string
          client_id?: string
          responsible_lawyer_id?: string | null
          assistant_lawyer_id?: string | null
          case_type_id?: string | null
          court_id?: string | null
          chamber_id?: string | null
          judge_id?: string | null
          governorate?: string | null
          registered_at?: string | null
          first_hearing_at?: string | null
          litigation_degree?: string | null
          claim_amount?: number | null
          priority?: string
          status?: string
          description?: string | null
          notes?: string | null
          closed_at?: string | null
          close_reason?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cases_assistant_lawyer_id_fkey"
            columns: ["assistant_lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_case_type_id_fkey"
            columns: ["case_type_id"]
            isOneToOne: false
            referencedRelation: "case_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_chamber_id_fkey"
            columns: ["chamber_id"]
            isOneToOne: false
            referencedRelation: "court_chambers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_responsible_lawyer_id_fkey"
            columns: ["responsible_lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          id: string
          client_no: string
          name: string
          client_type: string
          national_id: string | null
          phone: string | null
          whatsapp: string | null
          email: string | null
          address: string | null
          occupation: string | null
          file_opened_at: string
          responsible_lawyer_id: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          client_no: string
          name: string
          client_type?: string
          national_id?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          address?: string | null
          occupation?: string | null
          file_opened_at?: string
          responsible_lawyer_id?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          client_no?: string
          name?: string
          client_type?: string
          national_id?: string | null
          phone?: string | null
          whatsapp?: string | null
          email?: string | null
          address?: string | null
          occupation?: string | null
          file_opened_at?: string
          responsible_lawyer_id?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_responsible_lawyer_id_fkey"
            columns: ["responsible_lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          id: string
          contract_no: string
          title: string
          client_id: string
          counterparty: string | null
          contract_type: string | null
          start_date: string | null
          end_date: string | null
          value: number | null
          lawyer_id: string | null
          status: string
          document_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          contract_no: string
          title: string
          client_id: string
          counterparty?: string | null
          contract_type?: string | null
          start_date?: string | null
          end_date?: string | null
          value?: number | null
          lawyer_id?: string | null
          status?: string
          document_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          contract_no?: string
          title?: string
          client_id?: string
          counterparty?: string | null
          contract_type?: string | null
          start_date?: string | null
          end_date?: string | null
          value?: number | null
          lawyer_id?: string | null
          status?: string
          document_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      correspondence: {
        Row: {
          id: string
          reference_no: string
          direction: string
          party_type: string
          party_name: string
          client_id: string | null
          case_id: string | null
          subject: string
          body: string | null
          corr_date: string
          owner_id: string | null
          status: string
          document_id: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          reference_no: string
          direction: string
          party_type?: string
          party_name: string
          client_id?: string | null
          case_id?: string | null
          subject: string
          body?: string | null
          corr_date?: string
          owner_id?: string | null
          status?: string
          document_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          reference_no?: string
          direction?: string
          party_type?: string
          party_name?: string
          client_id?: string | null
          case_id?: string | null
          subject?: string
          body?: string | null
          corr_date?: string
          owner_id?: string | null
          status?: string
          document_id?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "correspondence_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "correspondence_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      court_chambers: {
        Row: {
          id: string
          court_id: string
          name_ar: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          court_id: string
          name_ar: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          court_id?: string
          name_ar?: string
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "court_chambers_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      courts: {
        Row: {
          id: string
          name_ar: string
          court_type: string | null
          governorate: string | null
          address: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_ar: string
          court_type?: string | null
          governorate?: string | null
          address?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          court_type?: string | null
          governorate?: string | null
          address?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          id: string
          name_ar: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_ar: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          id: string
          name: string
          category_id: string | null
          case_id: string | null
          client_id: string | null
          storage_path: string
          mime_type: string | null
          size_bytes: number | null
          doc_date: string | null
          description: string | null
          ocr_status: string
          ocr_text: string | null
          ocr_extracted: Json | null
          ocr_reviewed_at: string | null
          ocr_reviewed_by: string | null
          uploaded_by: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id?: string
          name: string
          category_id?: string | null
          case_id?: string | null
          client_id?: string | null
          storage_path: string
          mime_type?: string | null
          size_bytes?: number | null
          doc_date?: string | null
          description?: string | null
          ocr_status?: string
          ocr_text?: string | null
          ocr_extracted?: Json | null
          ocr_reviewed_at?: string | null
          ocr_reviewed_by?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category_id?: string | null
          case_id?: string | null
          client_id?: string | null
          storage_path?: string
          mime_type?: string | null
          size_bytes?: number | null
          doc_date?: string | null
          description?: string | null
          ocr_status?: string
          ocr_text?: string | null
          ocr_extracted?: Json | null
          ocr_reviewed_at?: string | null
          ocr_reviewed_by?: string | null
          uploaded_by?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_ocr_reviewed_by_fkey"
            columns: ["ocr_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          id: string
          name_ar: string
          sort_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name_ar: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name_ar?: string
          sort_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          id: string
          case_id: string | null
          client_id: string | null
          category_id: string | null
          account_id: string | null
          amount: number
          spent_at: string
          description: string | null
          is_billable: boolean
          is_reimbursed: boolean
          receipt_ref: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id?: string | null
          client_id?: string | null
          category_id?: string | null
          account_id?: string | null
          amount: number
          spent_at?: string
          description?: string | null
          is_billable?: boolean
          is_reimbursed?: boolean
          receipt_ref?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string | null
          client_id?: string | null
          category_id?: string | null
          account_id?: string | null
          amount?: number
          spent_at?: string
          description?: string | null
          is_billable?: boolean
          is_reimbursed?: boolean
          receipt_ref?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_installments: {
        Row: {
          id: string
          case_fee_id: string
          seq: number
          amount: number
          due_date: string
          paid_amount: number
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_fee_id: string
          seq: number
          amount: number
          due_date: string
          paid_amount?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_fee_id?: string
          seq?: number
          amount?: number
          due_date?: string
          paid_amount?: number
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_installments_case_fee_id_fkey"
            columns: ["case_fee_id"]
            isOneToOne: false
            referencedRelation: "case_fees"
            referencedColumns: ["id"]
          },
        ]
      }
      hearings: {
        Row: {
          id: string
          case_id: string
          court_id: string | null
          chamber_id: string | null
          judge_id: string | null
          hearing_date: string
          hearing_time: string | null
          room: string | null
          assigned_lawyer_id: string | null
          hearing_type: string
          required_action: string | null
          result: string | null
          decision: string | null
          notes: string | null
          next_hearing_date: string | null
          status: string
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          case_id: string
          court_id?: string | null
          chamber_id?: string | null
          judge_id?: string | null
          hearing_date: string
          hearing_time?: string | null
          room?: string | null
          assigned_lawyer_id?: string | null
          hearing_type?: string
          required_action?: string | null
          result?: string | null
          decision?: string | null
          notes?: string | null
          next_hearing_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          case_id?: string
          court_id?: string | null
          chamber_id?: string | null
          judge_id?: string | null
          hearing_date?: string
          hearing_time?: string | null
          room?: string | null
          assigned_lawyer_id?: string | null
          hearing_type?: string
          required_action?: string | null
          result?: string | null
          decision?: string | null
          notes?: string | null
          next_hearing_date?: string | null
          status?: string
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "hearings_assigned_lawyer_id_fkey"
            columns: ["assigned_lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_chamber_id_fkey"
            columns: ["chamber_id"]
            isOneToOne: false
            referencedRelation: "court_chambers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_judge_id_fkey"
            columns: ["judge_id"]
            isOneToOne: false
            referencedRelation: "judges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hearings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          id: string
          invoice_id: string
          description: string
          quantity: number
          unit_price: number
          line_total: number
          sort_order: number
        }
        Insert: {
          id?: string
          invoice_id: string
          description: string
          quantity?: number
          unit_price?: number
          line_total?: number
          sort_order?: number
        }
        Update: {
          id?: string
          invoice_id?: string
          description?: string
          quantity?: number
          unit_price?: number
          line_total?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          id: string
          invoice_no: string
          client_id: string
          case_id: string | null
          issue_date: string
          due_date: string | null
          subtotal: number
          discount: number
          tax_rate: number
          tax_amount: number
          total: number
          paid_amount: number
          status: string
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          invoice_no: string
          client_id: string
          case_id?: string | null
          issue_date?: string
          due_date?: string | null
          subtotal?: number
          discount?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          paid_amount?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          invoice_no?: string
          client_id?: string
          case_id?: string | null
          issue_date?: string
          due_date?: string | null
          subtotal?: number
          discount?: number
          tax_rate?: number
          tax_amount?: number
          total?: number
          paid_amount?: number
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      judges: {
        Row: {
          id: string
          full_name: string
          court_id: string | null
          title: string | null
          phone: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          full_name: string
          court_id?: string | null
          title?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          full_name?: string
          court_id?: string | null
          title?: string | null
          phone?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "judges_court_id_fkey"
            columns: ["court_id"]
            isOneToOne: false
            referencedRelation: "courts"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          user_id: string
          hearing_reminder: boolean
          hearing_days_before: number
          task_reminder: boolean
          installment_reminder: boolean
          contract_reminder: boolean
          contract_days_before: number
          poa_reminder: boolean
          poa_days_before: number
          invoice_reminder: boolean
          updated_at: string
        }
        Insert: {
          user_id: string
          hearing_reminder?: boolean
          hearing_days_before?: number
          task_reminder?: boolean
          installment_reminder?: boolean
          contract_reminder?: boolean
          contract_days_before?: number
          poa_reminder?: boolean
          poa_days_before?: number
          invoice_reminder?: boolean
          updated_at?: string
        }
        Update: {
          user_id?: string
          hearing_reminder?: boolean
          hearing_days_before?: number
          task_reminder?: boolean
          installment_reminder?: boolean
          contract_reminder?: boolean
          contract_days_before?: number
          poa_reminder?: boolean
          poa_days_before?: number
          invoice_reminder?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          kind: string
          title: string
          body: string | null
          entity: string | null
          entity_id: string | null
          link: string | null
          severity: string
          is_read: boolean
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          kind: string
          title: string
          body?: string | null
          entity?: string | null
          entity_id?: string | null
          link?: string | null
          severity?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          kind?: string
          title?: string
          body?: string | null
          entity?: string | null
          entity_id?: string | null
          link?: string | null
          severity?: string
          is_read?: boolean
          read_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      number_sequences: {
        Row: {
          key: string
          last_value: number
        }
        Insert: {
          key: string
          last_value?: number
        }
        Update: {
          key?: string
          last_value?: number
        }
        Relationships: []
      }
      opponents: {
        Row: {
          id: string
          case_id: string
          name: string
          national_id: string | null
          phone: string | null
          address: string | null
          lawyer_name: string | null
          lawyer_phone: string | null
          contact_info: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          case_id: string
          name: string
          national_id?: string | null
          phone?: string | null
          address?: string | null
          lawyer_name?: string | null
          lawyer_phone?: string | null
          contact_info?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          case_id?: string
          name?: string
          national_id?: string | null
          phone?: string | null
          address?: string | null
          lawyer_name?: string | null
          lawyer_phone?: string | null
          contact_info?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opponents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          id: string
          receipt_no: string
          client_id: string
          case_id: string | null
          invoice_id: string | null
          installment_id: string | null
          account_id: string | null
          amount: number
          method: string
          reference_no: string | null
          paid_at: string
          received_by: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          receipt_no: string
          client_id: string
          case_id?: string | null
          invoice_id?: string | null
          installment_id?: string | null
          account_id?: string | null
          amount: number
          method?: string
          reference_no?: string | null
          paid_at?: string
          received_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          receipt_no?: string
          client_id?: string
          case_id?: string | null
          invoice_id?: string | null
          installment_id?: string | null
          account_id?: string | null
          amount?: number
          method?: string
          reference_no?: string | null
          paid_at?: string
          received_by?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "fee_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          id: string
          code: string
          module: string
          action: string
          label_ar: string
        }
        Insert: {
          id?: string
          code: string
          module: string
          action: string
          label_ar: string
        }
        Update: {
          id?: string
          code?: string
          module?: string
          action?: string
          label_ar?: string
        }
        Relationships: []
      }
      powers_of_attorney: {
        Row: {
          id: string
          poa_no: string
          client_id: string
          case_id: string | null
          poa_type: string
          issued_at: string
          expires_at: string | null
          lawyer_id: string | null
          status: string
          document_id: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          poa_no: string
          client_id: string
          case_id?: string | null
          poa_type?: string
          issued_at: string
          expires_at?: string | null
          lawyer_id?: string | null
          status?: string
          document_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          poa_no?: string
          client_id?: string
          case_id?: string | null
          poa_type?: string
          issued_at?: string
          expires_at?: string | null
          lawyer_id?: string | null
          status?: string
          document_id?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "powers_of_attorney_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "powers_of_attorney_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "powers_of_attorney_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "powers_of_attorney_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "powers_of_attorney_lawyer_id_fkey"
            columns: ["lawyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string
          email: string
          phone: string | null
          job_title: string | null
          role_id: string
          avatar_url: string | null
          is_active: boolean
          last_login_at: string | null
          created_at: string
          updated_at: string
          deleted_at: string | null
        }
        Insert: {
          id: string
          username: string
          full_name: string
          email: string
          phone?: string | null
          job_title?: string | null
          role_id: string
          avatar_url?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          full_name?: string
          email?: string
          phone?: string | null
          job_title?: string | null
          role_id?: string
          avatar_url?: string | null
          is_active?: boolean
          last_login_at?: string | null
          created_at?: string
          updated_at?: string
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          role_id?: string
          permission_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          id: string
          code: string
          name_ar: string
          description: string | null
          is_system: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name_ar: string
          description?: string | null
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name_ar?: string
          description?: string | null
          is_system?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          id: boolean
          office_name: string
          office_logo_url: string | null
          office_address: string | null
          office_phone: string | null
          office_email: string | null
          office_website: string | null
          tax_number: string | null
          currency_code: string
          currency_symbol: string
          tax_enabled: boolean
          tax_rate: number
          invoice_prefix: string
          receipt_prefix: string
          client_prefix: string
          case_prefix: string
          invoice_notes: string | null
          bank_name: string | null
          bank_account_name: string | null
          bank_account_number: string | null
          bank_iban: string | null
          backup_frequency: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: boolean
          office_name?: string
          office_logo_url?: string | null
          office_address?: string | null
          office_phone?: string | null
          office_email?: string | null
          office_website?: string | null
          tax_number?: string | null
          currency_code?: string
          currency_symbol?: string
          tax_enabled?: boolean
          tax_rate?: number
          invoice_prefix?: string
          receipt_prefix?: string
          client_prefix?: string
          case_prefix?: string
          invoice_notes?: string | null
          bank_name?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          backup_frequency?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: boolean
          office_name?: string
          office_logo_url?: string | null
          office_address?: string | null
          office_phone?: string | null
          office_email?: string | null
          office_website?: string | null
          tax_number?: string | null
          currency_code?: string
          currency_symbol?: string
          tax_enabled?: boolean
          tax_rate?: number
          invoice_prefix?: string
          receipt_prefix?: string
          client_prefix?: string
          case_prefix?: string
          invoice_notes?: string | null
          bank_name?: string | null
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_iban?: string | null
          backup_frequency?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          case_id: string | null
          client_id: string | null
          assignee_id: string | null
          due_date: string | null
          priority: string
          status: string
          notes: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
          created_by: string | null
          updated_by: string | null
          deleted_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          case_id?: string | null
          client_id?: string | null
          assignee_id?: string | null
          due_date?: string | null
          priority?: string
          status?: string
          notes?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          case_id?: string | null
          client_id?: string | null
          assignee_id?: string | null
          due_date?: string | null
          priority?: string
          status?: string
          notes?: string | null
          completed_at?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
          updated_by?: string | null
          deleted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_id_fkey"
            columns: ["assignee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          id: string
          account_id: string
          direction: string
          amount: number
          occurred_at: string
          description: string | null
          source_table: string | null
          source_id: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          account_id: string
          direction: string
          amount: number
          occurred_at?: string
          description?: string | null
          source_table?: string | null
          source_id?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          account_id?: string
          direction?: string
          amount?: number
          occurred_at?: string
          description?: string | null
          source_table?: string | null
          source_id?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          user_id: string
          permission_id: string
          granted: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          permission_id: string
          granted: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          permission_id?: string
          granted?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_permissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      can_access_case: {
        Args: Record<string, unknown>
        Returns: Json
      }
      can_access_client: {
        Args: Record<string, unknown>
        Returns: Json
      }
      case_distribution: {
        Args: Record<string, unknown>
        Returns: Json
      }
      create_office_user: {
        Args: Record<string, unknown>
        Returns: Json
      }
      current_role_code: {
        Args: Record<string, unknown>
        Returns: Json
      }
      dashboard_stats: {
        Args: Record<string, unknown>
        Returns: Json
      }
      export_migrations: {
        Args: Record<string, unknown>
        Returns: Json
      }
      global_search: {
        Args: Record<string, unknown>
        Returns: Json
      }
      has_perm: {
        Args: Record<string, unknown>
        Returns: Json
      }
      introspect_schema: {
        Args: Record<string, unknown>
        Returns: Json
      }
      is_lawyer_scoped: {
        Args: Record<string, unknown>
        Returns: Json
      }
      is_super_admin: {
        Args: Record<string, unknown>
        Returns: Json
      }
      mark_overdue_tasks: {
        Args: Record<string, unknown>
        Returns: Json
      }
      my_permissions: {
        Args: Record<string, unknown>
        Returns: Json
      }
      next_sequence_number: {
        Args: Record<string, unknown>
        Returns: Json
      }
      resolve_login_email: {
        Args: Record<string, unknown>
        Returns: Json
      }
      restore_record: {
        Args: Record<string, unknown>
        Returns: undefined
      }
      set_user_password: {
        Args: Record<string, unknown>
        Returns: undefined
      }
      soft_delete: {
        Args: Record<string, unknown>
        Returns: undefined
      }
      verify_my_password: {
        Args: Record<string, unknown>
        Returns: Json
      }
      write_audit_log: {
        Args: Record<string, unknown>
        Returns: undefined
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

type PublicSchema = Database["public"]
export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"]
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"]
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"]

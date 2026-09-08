export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ajustes: {
        Row: {
          actualizado_en: string
          actualizado_por: string | null
          id: boolean
          mostrar_precio_divisa: boolean
          recargo_bs_pct: number
        }
        Insert: {
          actualizado_en?: string
          actualizado_por?: string | null
          id?: boolean
          mostrar_precio_divisa?: boolean
          recargo_bs_pct?: number
        }
        Update: {
          actualizado_en?: string
          actualizado_por?: string | null
          id?: boolean
          mostrar_precio_divisa?: boolean
          recargo_bs_pct?: number
        }
        Relationships: [
          {
            foreignKeyName: "ajustes_actualizado_por_fkey"
            columns: ["actualizado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      busquedas: {
        Row: {
          creado_en: string
          id: string
          perfil_id: string | null
          resultados: number
          termino: string
        }
        Insert: {
          creado_en?: string
          id?: string
          perfil_id?: string | null
          resultados?: number
          termino: string
        }
        Update: {
          creado_en?: string
          id?: string
          perfil_id?: string | null
          resultados?: number
          termino?: string
        }
        Relationships: [
          {
            foreignKeyName: "busquedas_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      carrito_items: {
        Row: {
          cantidad: number
          carrito_id: string
          creado_en: string
          id: string
          precio_usd_agregado: number
          producto_id: string
        }
        Insert: {
          cantidad?: number
          carrito_id: string
          creado_en?: string
          id?: string
          precio_usd_agregado: number
          producto_id: string
        }
        Update: {
          cantidad?: number
          carrito_id?: string
          creado_en?: string
          id?: string
          precio_usd_agregado?: number
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrito_items_carrito_id_fkey"
            columns: ["carrito_id"]
            isOneToOne: false
            referencedRelation: "carritos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrito_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      carritos: {
        Row: {
          actualizado_en: string
          creado_en: string
          id: string
          perfil_id: string | null
          token: string
        }
        Insert: {
          actualizado_en?: string
          creado_en?: string
          id?: string
          perfil_id?: string | null
          token?: string
        }
        Update: {
          actualizado_en?: string
          creado_en?: string
          id?: string
          perfil_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "carritos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      categorias: {
        Row: {
          activa: boolean
          creado_en: string
          id: string
          nombre: string
          orden: number
          padre_id: string | null
          slug: string
        }
        Insert: {
          activa?: boolean
          creado_en?: string
          id?: string
          nombre: string
          orden?: number
          padre_id?: string | null
          slug: string
        }
        Update: {
          activa?: boolean
          creado_en?: string
          id?: string
          nombre?: string
          orden?: number
          padre_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categorias_padre_id_fkey"
            columns: ["padre_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      favoritos: {
        Row: {
          creado_en: string
          id: string
          perfil_id: string
          precio_usd_guardado: number
          producto_id: string
        }
        Insert: {
          creado_en?: string
          id?: string
          perfil_id: string
          precio_usd_guardado: number
          producto_id: string
        }
        Update: {
          creado_en?: string
          id?: string
          perfil_id?: string
          precio_usd_guardado?: number
          producto_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favoritos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favoritos_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      marcas: {
        Row: {
          activa: boolean
          creado_en: string
          id: string
          nombre: string
          slug: string
        }
        Insert: {
          activa?: boolean
          creado_en?: string
          id?: string
          nombre: string
          slug: string
        }
        Update: {
          activa?: boolean
          creado_en?: string
          id?: string
          nombre?: string
          slug?: string
        }
        Relationships: []
      }
      movimientos_inventario: {
        Row: {
          cantidad: number
          creado_en: string
          id: string
          motivo: Database["public"]["Enums"]["motivo_movimiento"]
          nota: string | null
          pedido_id: string | null
          perfil_id: string | null
          producto_id: string
          stock_resultante: number
        }
        Insert: {
          cantidad: number
          creado_en?: string
          id?: string
          motivo: Database["public"]["Enums"]["motivo_movimiento"]
          nota?: string | null
          pedido_id?: string | null
          perfil_id?: string | null
          producto_id: string
          stock_resultante: number
        }
        Update: {
          cantidad?: number
          creado_en?: string
          id?: string
          motivo?: Database["public"]["Enums"]["motivo_movimiento"]
          nota?: string | null
          pedido_id?: string | null
          perfil_id?: string | null
          producto_id?: string
          stock_resultante?: number
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_inventario_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_inventario_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pagos: {
        Row: {
          comprobante_url: string | null
          creado_en: string
          estado: Database["public"]["Enums"]["estado_pago"]
          id: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto_usd: number
          pedido_id: string
          referencia: string | null
          registrado_por: string | null
          tasa_cambio: number
        }
        Insert: {
          comprobante_url?: string | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          id?: string
          metodo: Database["public"]["Enums"]["metodo_pago"]
          monto_usd: number
          pedido_id: string
          referencia?: string | null
          registrado_por?: string | null
          tasa_cambio: number
        }
        Update: {
          comprobante_url?: string | null
          creado_en?: string
          estado?: Database["public"]["Enums"]["estado_pago"]
          id?: string
          metodo?: Database["public"]["Enums"]["metodo_pago"]
          monto_usd?: number
          pedido_id?: string
          referencia?: string | null
          registrado_por?: string | null
          tasa_cambio?: number
        }
        Relationships: [
          {
            foreignKeyName: "pagos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pagos_registrado_por_fkey"
            columns: ["registrado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_eventos: {
        Row: {
          autor_id: string | null
          creado_en: string
          descripcion: string
          estado_nuevo: Database["public"]["Enums"]["estado_pedido"] | null
          id: string
          pedido_id: string
        }
        Insert: {
          autor_id?: string | null
          creado_en?: string
          descripcion: string
          estado_nuevo?: Database["public"]["Enums"]["estado_pedido"] | null
          id?: string
          pedido_id: string
        }
        Update: {
          autor_id?: string | null
          creado_en?: string
          descripcion?: string
          estado_nuevo?: Database["public"]["Enums"]["estado_pedido"] | null
          id?: string
          pedido_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedido_eventos_autor_id_fkey"
            columns: ["autor_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_eventos_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedido_items: {
        Row: {
          cantidad: number
          creado_en: string
          garantia_meses: number | null
          garantia_vitalicia: boolean
          id: string
          nombre_producto: string
          pedido_id: string
          precio_usd_unitario: number
          producto_id: string | null
        }
        Insert: {
          cantidad: number
          creado_en?: string
          garantia_meses?: number | null
          garantia_vitalicia?: boolean
          id?: string
          nombre_producto: string
          pedido_id: string
          precio_usd_unitario: number
          producto_id?: string | null
        }
        Update: {
          cantidad?: number
          creado_en?: string
          garantia_meses?: number | null
          garantia_vitalicia?: boolean
          id?: string
          nombre_producto?: string
          pedido_id?: string
          precio_usd_unitario?: number
          producto_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pedido_items_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "pedidos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedido_items_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      pedidos: {
        Row: {
          actualizado_en: string
          atendido_por: string | null
          ciudad_destino: string | null
          cliente_correo: string | null
          cliente_nombre: string
          cliente_whatsapp: string
          confirmado_en: string | null
          creado_en: string
          empresa_encomienda: string | null
          entrega: Database["public"]["Enums"]["tipo_entrega"]
          entregado_en: string | null
          es_encargo: boolean
          estado: Database["public"]["Enums"]["estado_pedido"]
          flete_usd: number
          id: string
          inventario_descontado: boolean
          metodo_pago: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_cancelacion: string | null
          numero: string
          numero_guia: string | null
          para_que_lo_usa: string | null
          perfil_id: string | null
          plazo_encargo_dias: number | null
          subtotal_usd: number
          tasa_cambio: number
          total_usd: number
        }
        Insert: {
          actualizado_en?: string
          atendido_por?: string | null
          ciudad_destino?: string | null
          cliente_correo?: string | null
          cliente_nombre: string
          cliente_whatsapp: string
          confirmado_en?: string | null
          creado_en?: string
          empresa_encomienda?: string | null
          entrega: Database["public"]["Enums"]["tipo_entrega"]
          entregado_en?: string | null
          es_encargo?: boolean
          estado?: Database["public"]["Enums"]["estado_pedido"]
          flete_usd?: number
          id?: string
          inventario_descontado?: boolean
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_cancelacion?: string | null
          numero?: string
          numero_guia?: string | null
          para_que_lo_usa?: string | null
          perfil_id?: string | null
          plazo_encargo_dias?: number | null
          subtotal_usd: number
          tasa_cambio: number
          total_usd: number
        }
        Update: {
          actualizado_en?: string
          atendido_por?: string | null
          ciudad_destino?: string | null
          cliente_correo?: string | null
          cliente_nombre?: string
          cliente_whatsapp?: string
          confirmado_en?: string | null
          creado_en?: string
          empresa_encomienda?: string | null
          entrega?: Database["public"]["Enums"]["tipo_entrega"]
          entregado_en?: string | null
          es_encargo?: boolean
          estado?: Database["public"]["Enums"]["estado_pedido"]
          flete_usd?: number
          id?: string
          inventario_descontado?: boolean
          metodo_pago?: Database["public"]["Enums"]["metodo_pago"] | null
          motivo_cancelacion?: string | null
          numero?: string
          numero_guia?: string | null
          para_que_lo_usa?: string | null
          perfil_id?: string | null
          plazo_encargo_dias?: number | null
          subtotal_usd?: number
          tasa_cambio?: number
          total_usd?: number
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_atendido_por_fkey"
            columns: ["atendido_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
      perfiles: {
        Row: {
          actualizado_en: string
          correo: string
          creado_en: string
          foto_url: string | null
          id: string
          nombre: string
          rol: Database["public"]["Enums"]["rol_usuario"]
          whatsapp: string | null
          whatsapp_verificado: boolean
        }
        Insert: {
          actualizado_en?: string
          correo: string
          creado_en?: string
          foto_url?: string | null
          id: string
          nombre: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          whatsapp?: string | null
          whatsapp_verificado?: boolean
        }
        Update: {
          actualizado_en?: string
          correo?: string
          creado_en?: string
          foto_url?: string | null
          id?: string
          nombre?: string
          rol?: Database["public"]["Enums"]["rol_usuario"]
          whatsapp?: string | null
          whatsapp_verificado?: boolean
        }
        Relationships: []
      }
      producto_imagenes: {
        Row: {
          alt: string | null
          creado_en: string
          id: string
          orden: number
          producto_id: string
          url: string
        }
        Insert: {
          alt?: string | null
          creado_en?: string
          id?: string
          orden?: number
          producto_id: string
          url: string
        }
        Update: {
          alt?: string | null
          creado_en?: string
          id?: string
          orden?: number
          producto_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "producto_imagenes_producto_id_fkey"
            columns: ["producto_id"]
            isOneToOne: false
            referencedRelation: "productos"
            referencedColumns: ["id"]
          },
        ]
      }
      productos: {
        Row: {
          activo: boolean
          actualizado_en: string
          categoria_id: string
          condicion: Database["public"]["Enums"]["condicion_producto"]
          creado_en: string
          descripcion: string | null
          destacado: boolean
          dias_encargo: number | null
          especificaciones: Json
          garantia_meses: number | null
          garantia_respalda: Database["public"]["Enums"]["respaldo_garantia"]
          garantia_vitalicia: boolean
          id: string
          marca_id: string | null
          nombre: string
          precio_referencia_usd: number | null
          precio_usd: number
          procedencia: string
          resumen: string | null
          slug: string
          stock: number
        }
        Insert: {
          activo?: boolean
          actualizado_en?: string
          categoria_id: string
          condicion?: Database["public"]["Enums"]["condicion_producto"]
          creado_en?: string
          descripcion?: string | null
          destacado?: boolean
          dias_encargo?: number | null
          especificaciones?: Json
          garantia_meses?: number | null
          garantia_respalda?: Database["public"]["Enums"]["respaldo_garantia"]
          garantia_vitalicia?: boolean
          id?: string
          marca_id?: string | null
          nombre: string
          precio_referencia_usd?: number | null
          precio_usd: number
          procedencia?: string
          resumen?: string | null
          slug: string
          stock?: number
        }
        Update: {
          activo?: boolean
          actualizado_en?: string
          categoria_id?: string
          condicion?: Database["public"]["Enums"]["condicion_producto"]
          creado_en?: string
          descripcion?: string | null
          destacado?: boolean
          dias_encargo?: number | null
          especificaciones?: Json
          garantia_meses?: number | null
          garantia_respalda?: Database["public"]["Enums"]["respaldo_garantia"]
          garantia_vitalicia?: boolean
          id?: string
          marca_id?: string | null
          nombre?: string
          precio_referencia_usd?: number | null
          precio_usd?: number
          procedencia?: string
          resumen?: string | null
          slug?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "productos_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "categorias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "productos_marca_id_fkey"
            columns: ["marca_id"]
            isOneToOne: false
            referencedRelation: "marcas"
            referencedColumns: ["id"]
          },
        ]
      }
      seriales: {
        Row: {
          anotado_en: string
          anotado_por: string | null
          id: string
          pedido_item_id: string
          serial: string
        }
        Insert: {
          anotado_en?: string
          anotado_por?: string | null
          id?: string
          pedido_item_id: string
          serial: string
        }
        Update: {
          anotado_en?: string
          anotado_por?: string | null
          id?: string
          pedido_item_id?: string
          serial?: string
        }
        Relationships: [
          {
            foreignKeyName: "seriales_anotado_por_fkey"
            columns: ["anotado_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seriales_pedido_item_id_fkey"
            columns: ["pedido_item_id"]
            isOneToOne: false
            referencedRelation: "pedido_items"
            referencedColumns: ["id"]
          },
        ]
      }
      tasas_cambio: {
        Row: {
          creado_en: string
          fuente: Database["public"]["Enums"]["fuente_tasa"]
          id: string
          registrada_por: string | null
          valor: number
          vigente_desde: string
        }
        Insert: {
          creado_en?: string
          fuente?: Database["public"]["Enums"]["fuente_tasa"]
          id?: string
          registrada_por?: string | null
          valor: number
          vigente_desde?: string
        }
        Update: {
          creado_en?: string
          fuente?: Database["public"]["Enums"]["fuente_tasa"]
          id?: string
          registrada_por?: string | null
          valor?: number
          vigente_desde?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasas_cambio_registrada_por_fkey"
            columns: ["registrada_por"]
            isOneToOne: false
            referencedRelation: "perfiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      es_admin: { Args: never; Returns: boolean }
      mover_inventario: {
        Args: {
          p_cantidad: number
          p_motivo: Database["public"]["Enums"]["motivo_movimiento"]
          p_nota?: string
          p_pedido?: string
          p_producto: string
        }
        Returns: number
      }
      reclamar_pedidos_por_whatsapp: { Args: never; Returns: number }
      tasa_vigente: { Args: never; Returns: number }
    }
    Enums: {
      condicion_producto: "nuevo" | "reacondicionado" | "usado"
      estado_pago: "en_espera" | "verificado" | "rechazado"
      estado_pedido:
        | "por_confirmar"
        | "confirmado_y_pagado"
        | "comprado"
        | "en_transito"
        | "en_aduana"
        | "aqui"
        | "armando_probando"
        | "listo_entregar"
        | "entregado"
        | "sin_stock_pendiente"
        | "cancelado"
        | "cancelado_reembolsado"
      fuente_tasa: "bcv" | "manual" | "promedio"
      metodo_pago:
        | "pago_movil"
        | "transferencia_bs"
        | "zelle"
        | "binance"
        | "efectivo"
        | "tarjeta_internacional"
      motivo_movimiento: "entrada" | "venta" | "devolucion" | "ajuste"
      respaldo_garantia: "fabricante" | "apso"
      rol_usuario: "cliente" | "admin"
      tipo_entrega: "punto_fijo" | "envio_nacional"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      condicion_producto: ["nuevo", "reacondicionado", "usado"],
      estado_pago: ["en_espera", "verificado", "rechazado"],
      estado_pedido: [
        "por_confirmar",
        "confirmado_y_pagado",
        "comprado",
        "en_transito",
        "en_aduana",
        "aqui",
        "armando_probando",
        "listo_entregar",
        "entregado",
        "sin_stock_pendiente",
        "cancelado",
        "cancelado_reembolsado",
      ],
      fuente_tasa: ["bcv", "manual", "promedio"],
      metodo_pago: [
        "pago_movil",
        "transferencia_bs",
        "zelle",
        "binance",
        "efectivo",
        "tarjeta_internacional",
      ],
      motivo_movimiento: ["entrada", "venta", "devolucion", "ajuste"],
      respaldo_garantia: ["fabricante", "apso"],
      rol_usuario: ["cliente", "admin"],
      tipo_entrega: ["punto_fijo", "envio_nacional"],
    },
  },
} as const


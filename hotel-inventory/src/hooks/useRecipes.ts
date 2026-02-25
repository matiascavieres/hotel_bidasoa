import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Recipe } from '@/types'

export function useRecipes() {
  return useQuery({
    queryKey: ['recipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(
            *,
            product:products(id, code, name, format_ml, category:categories(name))
          )
        `)
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      return data as unknown as Recipe[]
    },
  })
}

export function useRecipe(id: string) {
  return useQuery({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(
            *,
            product:products(id, code, name, format_ml, category:categories(name))
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      return data as unknown as Recipe
    },
    enabled: !!id,
  })
}

export function useCreateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      name,
      description,
      ingredients,
    }: {
      name: string
      description?: string
      ingredients: { product_id: string; quantity_ml: number; notes?: string }[]
    }) => {
      // 1. Create recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({ name, description: description || null })
        .select()
        .single()

      if (recipeError) throw recipeError

      // 2. Create ingredients
      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            ingredients.map((ing) => ({
              recipe_id: recipe.id,
              product_id: ing.product_id,
              quantity_ml: ing.quantity_ml,
              notes: ing.notes || null,
            }))
          )

        if (ingredientsError) throw ingredientsError
      }

      return recipe
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

export function useUpdateRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      ingredients,
    }: {
      id: string
      name: string
      description?: string | null
      ingredients: { product_id: string; quantity_ml: number; notes?: string }[]
    }) => {
      // 1. Update recipe metadata
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({ name, description: description || null })
        .eq('id', id)

      if (recipeError) throw recipeError

      // 2. Delete existing ingredients
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id)

      if (deleteError) throw deleteError

      // 3. Re-insert ingredients
      if (ingredients.length > 0) {
        const { error: insertError } = await supabase
          .from('recipe_ingredients')
          .insert(
            ingredients.map((ing) => ({
              recipe_id: id,
              product_id: ing.product_id,
              quantity_ml: ing.quantity_ml,
              notes: ing.notes || null,
            }))
          )

        if (insertError) throw insertError
      }
    },
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
      queryClient.invalidateQueries({ queryKey: ['recipe', id] })
    },
  })
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recipes')
        .update({ is_active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

/**
 * Bulk create multiple recipes with their ingredients.
 * Used by the CSV import wizard.
 */
export function useBulkCreateRecipes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      recipesToCreate: {
        name: string
        ingredients: { product_id: string; quantity_ml: number; notes?: string }[]
      }[]
    ) => {
      const results: { created: number; errors: string[] } = {
        created: 0,
        errors: [],
      }

      for (const recipeData of recipesToCreate) {
        try {
          // Create recipe
          const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({ name: recipeData.name })
            .select()
            .single()

          if (recipeError) {
            results.errors.push(`${recipeData.name}: ${recipeError.message}`)
            continue
          }

          // Create ingredients
          const validIngredients = recipeData.ingredients.filter(
            (i) => i.product_id && i.quantity_ml > 0
          )

          if (validIngredients.length > 0) {
            const { error: ingError } = await supabase
              .from('recipe_ingredients')
              .insert(
                validIngredients.map((ing) => ({
                  recipe_id: recipe.id,
                  product_id: ing.product_id,
                  quantity_ml: ing.quantity_ml,
                  notes: ing.notes || null,
                }))
              )

            if (ingError) {
              results.errors.push(`${recipeData.name} (ingredientes): ${ingError.message}`)
            }
          }

          results.created++
        } catch (err) {
          results.errors.push(`${recipeData.name}: Error inesperado`)
        }
      }

      return results
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] })
    },
  })
}

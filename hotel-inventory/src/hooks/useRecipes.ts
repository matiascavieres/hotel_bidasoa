import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Recipe, RecipeUnit } from '@/types'

const RECIPE_IMAGES_BUCKET = 'product-images'

async function uploadRecipeImages(recipeId: string, files: File[]): Promise<string[]> {
  const paths: string[] = []
  for (const file of files) {
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${ext}`
    const filePath = `recipes/${recipeId}/${fileName}`
    const { error } = await supabase.storage
      .from(RECIPE_IMAGES_BUCKET)
      .upload(filePath, file, { contentType: file.type })
    if (!error) paths.push(filePath)
  }
  return paths
}

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
      portions,
      grupo,
      ingredients,
      imageFiles,
    }: {
      name: string
      description?: string
      portions?: number
      grupo?: string
      ingredients: { product_id: string; quantity_ml: number; unit: RecipeUnit; price_per_kg?: number; notes?: string }[]
      imageFiles?: File[]
    }) => {
      // 1. Create recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({ name, description: description || null, portions: portions ?? 1, grupo: grupo || null })
        .select()
        .single()

      if (recipeError) throw recipeError

      // 2. Upload images
      if (imageFiles && imageFiles.length > 0) {
        const imagePaths = await uploadRecipeImages(recipe.id, imageFiles)
        if (imagePaths.length > 0) {
          await supabase.from('recipes').update({ image_urls: imagePaths }).eq('id', recipe.id)
        }
      }

      // 3. Create ingredients
      if (ingredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            ingredients.map((ing) => ({
              recipe_id: recipe.id,
              product_id: ing.product_id,
              quantity_ml: ing.quantity_ml,
              unit: ing.unit,
              price_per_kg: ing.price_per_kg ?? null,
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
      portions,
      grupo,
      ingredients,
      imageFiles,
      existingImagePaths,
    }: {
      id: string
      name: string
      description?: string | null
      portions?: number
      grupo?: string | null
      ingredients: { product_id: string; quantity_ml: number; unit: RecipeUnit; price_per_kg?: number; notes?: string }[]
      imageFiles?: File[]
      existingImagePaths?: string[]
    }) => {
      // 1. Upload new images and merge with existing
      const newPaths = imageFiles && imageFiles.length > 0
        ? await uploadRecipeImages(id, imageFiles)
        : []
      const allImagePaths = [...(existingImagePaths || []), ...newPaths]

      // 2. Update recipe metadata + image_urls
      const { error: recipeError } = await supabase
        .from('recipes')
        .update({
          name,
          description: description || null,
          portions: portions ?? 1,
          grupo: grupo || null,
          image_urls: allImagePaths,
        })
        .eq('id', id)

      if (recipeError) throw recipeError

      // 3. Delete existing ingredients
      const { error: deleteError } = await supabase
        .from('recipe_ingredients')
        .delete()
        .eq('recipe_id', id)

      if (deleteError) throw deleteError

      // 4. Re-insert ingredients
      if (ingredients.length > 0) {
        const { error: insertError } = await supabase
          .from('recipe_ingredients')
          .insert(
            ingredients.map((ing) => ({
              recipe_id: id,
              product_id: ing.product_id,
              quantity_ml: ing.quantity_ml,
              unit: ing.unit,
              price_per_kg: ing.price_per_kg ?? null,
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
 * Used by the CSV/XLSX import wizards.
 */
export function useBulkCreateRecipes() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      recipesToCreate: {
        name: string
        portions?: number
        grupo?: string
        ingredients: { product_id: string; quantity_ml: number; unit: RecipeUnit; price_per_kg?: number; notes?: string }[]
      }[]
    ) => {
      const results: { created: number; errors: string[] } = {
        created: 0,
        errors: [],
      }

      for (const recipeData of recipesToCreate) {
        try {
          const { data: recipe, error: recipeError } = await supabase
            .from('recipes')
            .insert({ name: recipeData.name, portions: recipeData.portions ?? 1, grupo: recipeData.grupo || null })
            .select()
            .single()

          if (recipeError) {
            results.errors.push(`${recipeData.name}: ${recipeError.message}`)
            continue
          }

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
                  unit: ing.unit,
                  price_per_kg: ing.price_per_kg ?? null,
                  notes: ing.notes || null,
                }))
              )

            if (ingError) {
              results.errors.push(`${recipeData.name} (ingredientes): ${ingError.message}`)
            }
          }

          results.created++
        } catch {
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

import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';

import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const { data: stockProduct } = await api.get<Stock>(
        '/stock/' + productId,
      );

      if (!stockProduct) {
        throw new Error('Erro na adição do produto');
      }

      if (stockProduct.amount <= 0) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      const memoryCart = [...cart];

      const cartInProduct = memoryCart.find(
        (product) => product.id === productId,
      );

      if (cartInProduct) {
        if (cartInProduct.amount >= stockProduct.amount) {
          throw new Error('Quantidade solicitada fora de estoque');
        }

        cartInProduct.amount++;
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(memoryCart));
        return setCart(memoryCart);
      } else {
        const { data: product } = await api.get<Product>(
          '/products/' + productId,
        );

        if (!product) {
          throw new Error('Erro na adição do produto');
        }

        if (stockProduct.amount < 1)
          throw new Error('Quantidade solicitada fora de estoque');

        product.amount = 1;
        localStorage.setItem(
          '@RocketShoes:cart',
          JSON.stringify([...cart, product]),
        );
        return setCart([...cart, product]);
      }
    } catch (error) {
      if (error.response) {
        toast.error('Erro na adição do produto');
      }
      toast.error(error.message);
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const products = [...cart];
      const productIndex = products.findIndex(
        (product) => product.id === productId,
      );

      if (productIndex < 0) {
        throw new Error('Erro na remoção do produto');
      }

      products.splice(productIndex, 1);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(products));
      setCart(products);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const products = [...cart];

      const product = products.find((product) => product.id === productId);

      if (!product) {
        throw new Error('Erro na alteração de quantidade do produto');
      }

      const { data: stock } = await api.get<Stock>('/stock/' + productId);

      if (amount > stock.amount) {
        throw new Error('Quantidade solicitada fora de estoque');
      }

      product.amount = amount;
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
      setCart(products);
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
